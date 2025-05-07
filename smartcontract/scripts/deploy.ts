import { ethers } from "hardhat";

async function main() {
  const Tracker = await ethers.getContractFactory("Tracker");
  const tracker = await Tracker.deploy();

  await tracker.waitForDeployment();

  console.log("Tracker deployed to:", await tracker.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
