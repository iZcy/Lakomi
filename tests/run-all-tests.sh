#!/bin/bash
RPC=http://localhost:8545
ADDR_JSON=$(curl -s http://localhost:3030/contracts)
USDC=$(echo "$ADDR_JSON" | python3 -c "import sys,json; print(json.load(sys.stdin)['MOCK_USDC'])")
TOKEN=$(echo "$ADDR_JSON" | python3 -c "import sys,json; print(json.load(sys.stdin)['LAKOMI_TOKEN'])")
VAULT=$(echo "$ADDR_JSON" | python3 -c "import sys,json; print(json.load(sys.stdin)['LAKOMI_VAULT'])")
GOVERN=$(echo "$ADDR_JSON" | python3 -c "import sys,json; print(json.load(sys.stdin)['LAKOMI_GOVERN'])")
LOANS=$(echo "$ADDR_JSON" | python3 -c "import sys,json; print(json.load(sys.stdin)['LAKOMI_LOANS'])")

ADMIN=0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
MAIN=0x66534dD42A65a2386aA9cB9c36d37A35c01C77b6
PENGURUS=0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC
M3=0x90F79bf6EB2c4f870365E785982E1f101E93b906
M6=0x976EA74026E726554dB657fA54763abd0C3a0aa9
M7=0x14dC79964da2C08b23698B3D3cc7Ca32193d9955

PASS=0
FAIL=0

post() { curl -s -X POST $RPC -H 'Content-Type: application/json' -d "$1"; }
mine() { post '{"jsonrpc":"2.0","id":1,"method":"anvil_mine","params":[]}' > /dev/null; }
ff() { post '{"jsonrpc":"2.0","id":1,"method":"evm_increaseTime","params":['$1']}' > /dev/null; mine; }

send() {
  local FROM=$1 TO=$2 DATA=$3
  post "{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"anvil_impersonateAccount\",\"params\":[\"$FROM\"]}" > /dev/null
  local RES=$(post "{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"eth_sendTransaction\",\"params\":[{\"from\":\"$FROM\",\"to\":\"$TO\",\"data\":\"$DATA\",\"gas\":\"0x300000\"}]}")
  local HASH=$(echo "$RES" | python3 -c "import sys,json; print(json.load(sys.stdin).get('result',''))" 2>/dev/null)
  post "{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"anvil_stopImpersonatingAccount\",\"params\":[\"$FROM\"]}" > /dev/null
  mine
  if [ -z "$HASH" ]; then echo "FAIL: no hash"; return 1; fi
  local RECEIPT=$(post "{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"eth_getTransactionReceipt\",\"params\":[\"$HASH\"]}")
  local STATUS=$(echo "$RECEIPT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('result',{}).get('status','0x0'))" 2>/dev/null)
  [ "$STATUS" = "0x1" ] && echo "ok" || echo "REVERTED"
}

call() {
  post "{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"eth_call\",\"params\":[{\"to\":\"$1\",\"data\":\"$2\"},\"latest\"]}"
}

chk() {
  local NAME="$1" TO="$2" DATA="$3" EXPECT="$4"
  local RAW=$(call "$TO" "$DATA")
  local HEX=$(echo "$RAW" | python3 -c "import sys,json; print(json.load(sys.stdin).get('result','0x'))" 2>/dev/null)
  local VAL=$(python3 -c "print(int('$HEX',16))" 2>/dev/null)
  if [ "$VAL" = "$EXPECT" ]; then
    echo "  ✅ $NAME"; PASS=$((PASS+1))
  else
    echo "  ❌ $NAME (exp=$EXPECT got=$VAL)"; FAIL=$((FAIL+1))
  fi
}

# ============ SETUP ============
echo "=== SETUP: Fund + Register 4 Members ==="
for U in $MAIN $M3 $M6 $M7; do
  # Admin sends 10 ETH for gas
  send $ADMIN "$U" "0x" > /dev/null
  post "{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"anvil_setBalance\",\"params\":[\"$U\",\"0x8AC7230489E80000\"]}" > /dev/null
  # Admin mints USDC
  send $ADMIN $USDC $(cast calldata "mint(address,uint256)" $U 1000000000000 2>/dev/null) > /dev/null
  # Member approves vault
  send $U $USDC $(cast calldata "approve(address,uint256)" $VAULT 200000000 2>/dev/null) > /dev/null
  # Admin pays simpanan pokok
  send $ADMIN $VAULT $(cast calldata "paySimpananPokok(address)" $U) > /dev/null
  # Member registers
  send $U $TOKEN $(cast calldata "registerMember()") > /dev/null
  sleep 0.1
done
chk "All 4 registered" $TOKEN $(cast calldata "isRegisteredMember(address)" $MAIN) 1

# ============ CASE 1: Loan ============
echo ""
echo "=== CASE 1: Loan → Approve → Disburse → Repay ==="
send $MAIN $VAULT $(cast calldata "deposit(uint256)" 500000000) > /dev/null
send $MAIN $LOANS $(cast calldata "requestLoan(uint256,uint256,string)" 50000000 2592000 test) > /dev/null
send $PENGURUS $LOANS $(cast calldata "approveLoan(uint256)" 0) > /dev/null
send $MAIN $LOANS $(cast calldata "disburseLoan(uint256)" 0) > /dev/null
send $MAIN $USDC $(cast calldata "approve(address,uint256)" $LOANS 52000000) > /dev/null
send $MAIN $LOANS $(cast calldata "repayInFull(uint256)" 0) > /dev/null
chk "Loan created" $LOANS $(cast calldata "loanCount()") 1

# ============ CASE 2: Vote Setuju ============
echo ""
echo "=== CASE 2: Vote Setuju → Execute (Anggaran) ==="
send $MAIN $GOVERN $(cast calldata "createProposal(string,uint8,address,uint256,bytes)" "Anggaran Test" 0 $M3 10000000 0x00) > /dev/null
send $MAIN $GOVERN $(cast calldata "castVote(uint256,uint8)" 1 1) > /dev/null
send $M3 $GOVERN $(cast calldata "castVote(uint256,uint8)" 1 1) > /dev/null
send $M7 $GOVERN $(cast calldata "castVote(uint256,uint8)" 1 1) > /dev/null
ff 604800
send $MAIN $GOVERN $(cast calldata "queue(uint256)" 1) > /dev/null
ff 86400
send $MAIN $GOVERN $(cast calldata "execute(uint256)" 1) > /dev/null
chk "Proposal executed" $GOVERN $(cast calldata "state(uint256)" 1) 7

# ============ CASE 3: Vote Tolak ============
echo ""
echo "=== CASE 3: Vote Tolak → Defeated ==="
send $MAIN $GOVERN $(cast calldata "createProposal(string,uint8,address,uint256,bytes)" "Vote Tolak" 0 $M3 5000000 0x00) > /dev/null
send $M6 $GOVERN $(cast calldata "castVote(uint256,uint8)" 2 0) > /dev/null
send $M7 $GOVERN $(cast calldata "castVote(uint256,uint8)" 2 0) > /dev/null
ff 604800
chk "Vote Tolak → Defeated" $GOVERN $(cast calldata "state(uint256)" 2) 3

# ============ CASE 5: Quorum Fail ============
echo ""
echo "=== CASE 5: Quorum Fail ==="
send $MAIN $GOVERN $(cast calldata "createProposal(string,uint8,address,uint256,bytes)" "Quorum Fail" 0 $M3 1000000 0x00) > /dev/null
send $MAIN $GOVERN $(cast calldata "castVote(uint256,uint8)" 3 1) > /dev/null
ff 604800
chk "Quorum Fail → Defeated" $GOVERN $(cast calldata "state(uint256)" 3) 3

# ============ CASE 7: Kick Member ============
echo ""
echo "=== CASE 7: Kick M6 ==="
REVOKE=$(cast calldata "revokeMembership(address)" $M6)
send $MAIN $GOVERN $(cast calldata "createProposal(string,uint8,address,uint256,bytes)" "Kick M6" 2 $TOKEN 0 $REVOKE) > /dev/null
send $MAIN $GOVERN $(cast calldata "castVote(uint256,uint8)" 4 1) > /dev/null
send $M3 $GOVERN $(cast calldata "castVote(uint256,uint8)" 4 1) > /dev/null
send $M7 $GOVERN $(cast calldata "castVote(uint256,uint8)" 4 1) > /dev/null
ff 604800
send $MAIN $GOVERN $(cast calldata "queue(uint256)" 4) > /dev/null
ff 86400
send $MAIN $GOVERN $(cast calldata "execute(uint256)" 4) > /dev/null
chk "M6 kicked" $TOKEN $(cast calldata "isRegisteredMember(address)" $M6) 0

# ============ CASE 13: Exit ============
echo ""
echo "=== CASE 13: Voluntary Exit ==="
send $MAIN $TOKEN $(cast calldata "resignMembership()") > /dev/null
chk "Main exited" $TOKEN $(cast calldata "isRegisteredMember(address)" $MAIN) 0

echo ""
echo "=== RESULTS: $PASS / $((PASS+FAIL)) passed ==="
[ $FAIL -eq 0 ] && echo "ALL PASSED ✅" || echo "SOME FAILED ❌"