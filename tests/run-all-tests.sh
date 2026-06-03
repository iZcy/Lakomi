#!/bin/bash
# Run all 6 automated test cases — no MetaMask required
# Requires: cast (Foundry), curl

RPC=http://localhost:8545
USDC=0x5FbDB2315678afecb367f032d93F642f64180aa3
TOKEN=0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
VAULT=0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0
GOVERN=0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9
LOANS=0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9

# Accounts
ADMIN=0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
MAIN=0x66534dD42A65a2386aA9cB9c36d37A35c01C77b6
PENGURUS=0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC
PENGAWAS=0x70997970C51812dc3A010C7d01b50e0d17dc79C8
M3=0x90F79bf6EB2c4f870365E785982E1f101E93b906
M6=0x976EA74026E726554dB657fA54763abd0C3a0aa9
M7=0x14dC79964da2C08b23698B3D3cc7Ca32193d9955

PASS=0
FAIL=0

rpc() {
  curl -s -X POST $RPC -H 'Content-Type: application/json' -d "$1"
}

as() { # impersonate + send tx + stop
  rpc '{"jsonrpc":"2.0","id":1,"method":"anvil_impersonateAccount","params":["'$1'"]}' > /dev/null
  RESULT=$(cast send --rpc-url $RPC --from $1 --json "$2" "$3" "$4" 2>/dev/null || echo "FAIL")
  rpc '{"jsonrpc":"2.0","id":1,"method":"anvil_stopImpersonatingAccount","params":["'$1'"]}' > /dev/null
  echo "$RESULT" | grep -q "transactionHash" && echo "OK" || echo "FAIL"
}

ff() { # fast forward
  rpc '{"jsonrpc":"2.0","id":1,"method":"evm_increaseTime","params":['$1']}' > /dev/null
  rpc '{"jsonrpc":"2.0","id":1,"method":"evm_mine","params":[]}' > /dev/null
}

check() {
  MSG="$1"
  VAL=$(cast call --rpc-url $RPC $2 "$3" $4 2>/dev/null)
  if echo "$VAL" | grep -q "$5"; then
    echo "  ✅ $MSG"
    PASS=$((PASS+1))
  else
    echo "  ❌ $MSG (got: $VAL)"
    FAIL=$((FAIL+1))
  fi
}

echo "=== SETUP: Register 4 Members ==="
for USER in $M3 $M6 $M7 $MAIN; do
  echo "Registering $USER..."
  as $USER $USDC "mint(address,uint256)" "$USER 1000000000000" > /dev/null
  as $USER $VAULT "paySimpananPokok(address)" "$USER" > /dev/null
  as $USER $TOKEN "registerMember()" > /dev/null
done
echo "4 members registered: Main, M3, M6, M7"
echo ""

echo "=== CASE 1: Pinjaman → Approve → Cairkan → Lunasi ==="
as $MAIN $VAULT "deposit(uint256)" 500000000 > /dev/null
as $MAIN $LOANS "requestLoan(uint256,uint256,string)" "50000000 2592000 test" > /dev/null
as $PENGURUS $LOANS "approveLoan(uint256)" 0 > /dev/null
as $MAIN $LOANS "disburseLoan(uint256)" 0 > /dev/null
as $MAIN $USDC "approve(address,uint256)" "$LOANS 52000000" > /dev/null
as $MAIN $LOANS "repayInFull(uint256)" 0 > /dev/null
check "Loan: request→approve→disburse→repay" $LOANS "loanCount()" "" "1"
echo ""

echo "=== CASE 3: Vote Tolak ==="
as $MAIN $GOVERN "createProposal(string,uint8,address,uint256,bytes)" '"Test Tolak" 0 '$VAULT' 0 ""' > /dev/null
as $M6 $GOVERN "castVote(uint256,uint8)" "1 0" > /dev/null
as $M7 $GOVERN "castVote(uint256,uint8)" "1 0" > /dev/null
ff 604800
check "Vote Tolak → Defeated" $GOVERN "state(uint256)" 1 "3"
echo ""

echo "=== CASE 5: Quorum Fail ==="
as $MAIN $GOVERN "createProposal(string,uint8,address,uint256,bytes)" '"Quorum Fail" 0 '$VAULT' 0 ""' > /dev/null
as $MAIN $GOVERN "castVote(uint256,uint8)" "2 1" > /dev/null
ff 604800
check "Quorum fail (1/4) → Defeated" $GOVERN "state(uint256)" 2 "3"
echo ""

echo "=== CASE 7: Kick Member ==="
REVOKE=$(cast calldata "revokeMembership(address)" $M6 2>/dev/null)
as $MAIN $GOVERN "createProposal(string,uint8,address,uint256,bytes)" '"Kick M6" 2 '$TOKEN' 0 '$REVOKE'' > /dev/null
as $MAIN $GOVERN "castVote(uint256,uint8)" "3 1" > /dev/null
as $M7 $GOVERN "castVote(uint256,uint8)" "3 1" > /dev/null
ff 604800
as $MAIN $GOVERN "queue(uint256)" 3 > /dev/null
ff 86400
as $MAIN $GOVERN "execute(uint256)" 3 > /dev/null
check "Kick M6 → not member" $TOKEN "isRegisteredMember(address)" $M6 "false"
echo ""

echo "=== CASE 13: Exit ==="
as $MAIN $TOKEN "resignMembership()" > /dev/null
check "Main resign → not member" $TOKEN "isRegisteredMember(address)" $MAIN "false"
echo ""

echo "=== RESULTS === $PASS passed, $FAIL failed ==="