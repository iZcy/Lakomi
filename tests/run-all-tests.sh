#!/bin/bash
RPC=http://localhost:8545

# Read contract addresses dynamically
ADDR=$(curl -s http://localhost:3030/contracts 2>/dev/null || cat $(dirname $0)/../contract-addresses.json 2>/dev/null)
USDC=$(echo "$ADDR" | python3 -c "import sys,json; print(json.load(sys.stdin)['MOCK_USDC'])" 2>/dev/null)
TOKEN=$(echo "$ADDR" | python3 -c "import sys,json; print(json.load(sys.stdin)['LAKOMI_TOKEN'])" 2>/dev/null)
VAULT=$(echo "$ADDR" | python3 -c "import sys,json; print(json.load(sys.stdin)['LAKOMI_VAULT'])" 2>/dev/null)
GOVERN=$(echo "$ADDR" | python3 -c "import sys,json; print(json.load(sys.stdin)['LAKOMI_GOVERN'])" 2>/dev/null)
LOANS=$(echo "$ADDR" | python3 -c "import sys,json; print(json.load(sys.stdin)['LAKOMI_LOANS'])" 2>/dev/null)
echo "Contracts: TOKEN=$TOKEN VAULT=$VAULT GOVERN=$GOVERN LOANS=$LOANS"

ADMIN=0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
MAIN=0x66534dD42A65a2386aA9cB9c36d37A35c01C77b6
PENGURUS=0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC
M3=0x90F79bf6EB2c4f870365E785982E1f101E93b906
M6=0x976EA74026E726554dB657fA54763abd0C3a0aa9
M7=0x14dC79964da2C08b23698B3D3cc7Ca32193d9955

PASS=0; FAIL=0

post() { curl -s -X POST $RPC -H 'Content-Type: application/json' -d "$1"; }

tx() {
  local FROM=$1 TO=$2 DATA=$3
  post '{"jsonrpc":"2.0","id":1,"method":"anvil_impersonateAccount","params":["'$FROM'"]}' > /dev/null
  local RESULT=$(post '{"jsonrpc":"2.0","id":1,"method":"eth_sendTransaction","params":[{"from":"'$FROM'","to":"'$TO'","data":"'$DATA'","gas":"0x300000"}]}')
  local HASH=$(echo "$RESULT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('result',''))" 2>/dev/null)
  post '{"jsonrpc":"2.0","id":1,"method":"anvil_stopImpersonatingAccount","params":["'$FROM'"]}' > /dev/null
  post '{"jsonrpc":"2.0","id":1,"method":"anvil_mine","params":[]}' > /dev/null
  # Check receipt
  local RECEIPT=$(post '{"jsonrpc":"2.0","id":1,"method":"eth_getTransactionReceipt","params":["'$HASH'"]}')
  local STATUS=$(echo "$RECEIPT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('result',{}).get('status','0x0'))" 2>/dev/null)
  [ "$STATUS" = "0x1" ] && echo "ok" || echo "revert"
}

ff() {
  post '{"jsonrpc":"2.0","id":1,"method":"evm_increaseTime","params":['$1']}' > /dev/null
  post '{"jsonrpc":"2.0","id":1,"method":"evm_mine","params":[]}' > /dev/null
}

chk() {
  local NAME="$1" TO="$2" DATA="$3" EXPECT="$4"
  local RAW=$(post '{"jsonrpc":"2.0","id":1,"method":"eth_call","params":[{"to":"'$TO'","data":"'$DATA'"},"latest"]}')
  local HEX=$(echo "$RAW" | python3 -c "import sys,json; print(json.load(sys.stdin).get('result','0x'))" 2>/dev/null)
  local VAL=$(python3 -c "print(int('$HEX',16))" 2>/dev/null)
  if [ "$VAL" = "$EXPECT" ]; then
    echo "  ✅ $NAME"
    PASS=$((PASS+1))
  else
    echo "  ❌ $NAME (exp=$EXPECT got=$VAL)"
    FAIL=$((FAIL+1))
  fi
}

echo "=== SETUP: Register 4 Members ==="
for USER in $MAIN $M3 $M6 $M7; do
  # Admin mints USDC to member
  DATA=$(cast calldata "mint(address,uint256)" $USER 1000000000000)
  tx $ADMIN $USDC $DATA > /dev/null
  # Member approves vault
  DATA=$(cast calldata "approve(address,uint256)" $VAULT 200000000)
  tx $USER $USDC $DATA > /dev/null
  # Admin pays simpanan pokok for member
  DATA=$(cast calldata "paySimpananPokok(address)" $USER)
  tx $ADMIN $VAULT $DATA > /dev/null
  # Member registers
  DATA=$(cast calldata "registerMember()")
  tx $USER $TOKEN $DATA > /dev/null
done
DATA=$(cast calldata "isRegisteredMember(address)" $MAIN)
chk "Main registered" $TOKEN "$DATA" "1"

echo ""
echo "=== CASE 1: Loan → Repay ==="
DATA=$(cast calldata "deposit(uint256)" 500000000)
tx $MAIN $VAULT $DATA > /dev/null
DATA=$(cast calldata "requestLoan(uint256,uint256,string)" 50000000 2592000 test)
tx $MAIN $LOANS $DATA > /dev/null
DATA=$(cast calldata "approveLoan(uint256)" 0)
tx $PENGURUS $LOANS $DATA > /dev/null
DATA=$(cast calldata "disburseLoan(uint256)" 0)
tx $MAIN $LOANS $DATA > /dev/null
DATA=$(cast calldata "approve(address,uint256)" $LOANS 52000000)
tx $MAIN $USDC $DATA > /dev/null
DATA=$(cast calldata "repayInFull(uint256)" 0)
tx $MAIN $LOANS $DATA > /dev/null
DATA=$(cast calldata "loanCount()")
chk "Loan repaid" $LOANS "$DATA" "1"
chk "Vote Tolak → Defeated" $GOVERN "$DATA" "3"
chk "Quorum Fail" $GOVERN "$DATA" "3"
chk "M6 kicked" $TOKEN "$DATA" "0"
chk "Main exited" $TOKEN "$DATA" "0"

echo ""
echo "=== RESULTS: $PASS passed, $FAIL failed ==="