#!/bin/bash
set -e

RPC="${RPC_URL:-http://anvil:8545}"
MAX_WAIT=30

echo "Waiting for Anvil at $RPC ..."
for i in $(seq 1 $MAX_WAIT); do
  if curl -sf "$RPC" -X POST -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' | grep -q "result"; then
    echo "Anvil is ready!"
    break
  fi
  if [ "$i" = "$MAX_WAIT" ]; then
    echo "Anvil not ready after ${MAX_WAIT}s, exiting."
    exit 1
  fi
  sleep 1
done

echo "Deploying contracts..."
npx hardhat run /app/hardhat/scripts/deploy.js --network localhost
echo "Deploy complete!"

echo "Funding default accounts..."
npx hardhat console --network localhost --no-compile --config /app/hardhat/hardhat.config.js <<'SCRIPT'
const [deployer, acc1, acc2] = await ethers.getSigners();
for (const acc of [acc1, acc2]) {
  const tx = await deployer.sendTransaction({ to: acc.address, value: ethers.parseEther("10.0") });
  await tx.wait();
  console.log("Funded", acc.address, "with 10 ETH");
}
SCRIPT

echo "All done! Contracts deployed and accounts funded."

echo "Starting redeploy server..."
exec node /app/redeploy-server.mjs
