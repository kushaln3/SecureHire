import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
    const semaphoreAddress = "0x8A1fd199516489B0Fb7153EB5f075cDAC83c693D"; // Sepolia Semaphore V4
    const [deployer] = await ethers.getSigners();
    console.log("Deploying contracts with account:", deployer.address);

    const CourseRegistry = await ethers.getContractFactory("CourseRegistry");
    const courseRegistry = await CourseRegistry.deploy();
    await courseRegistry.waitForDeployment();
    const courseRegistryAddress = await courseRegistry.getAddress();
    console.log("CourseRegistry deployed to:", courseRegistryAddress);

    const CredentialIssuer = await ethers.getContractFactory("CredentialIssuer");
    const credentialIssuer = await CredentialIssuer.deploy(semaphoreAddress, courseRegistryAddress);
    await credentialIssuer.waitForDeployment();
    const credentialIssuerAddress = await credentialIssuer.getAddress();
    console.log("CredentialIssuer deployed to:", credentialIssuerAddress);

    await courseRegistry.setIssuer(credentialIssuerAddress);
    console.log("Set CredentialIssuer as issuer on CourseRegistry");

    const CredentialVerifier = await ethers.getContractFactory("CredentialVerifier");
    const credentialVerifier = await CredentialVerifier.deploy(semaphoreAddress, courseRegistryAddress);
    await credentialVerifier.waitForDeployment();
    const credentialVerifierAddress = await credentialVerifier.getAddress();
    console.log("CredentialVerifier deployed to:", credentialVerifierAddress);

    const deployments = {
        CourseRegistry: courseRegistryAddress,
        CredentialIssuer: credentialIssuerAddress,
        CredentialVerifier: credentialVerifierAddress,
        Semaphore: semaphoreAddress
    };

    const deploymentsDir = path.join(__dirname, "../deployments");
    if (!fs.existsSync(deploymentsDir)) {
        fs.mkdirSync(deploymentsDir, { recursive: true });
    }
    
    // Save locally
    const network = process.env.HARDHAT_NETWORK || "sepolia";
    fs.writeFileSync(
        path.join(deploymentsDir, `${network}.json`),
        JSON.stringify(deployments, null, 2)
    );

    // Save for frontend if it exists
    const webLibDir = path.join(__dirname, "../../../apps/web/src/lib");
    if (fs.existsSync(webLibDir)) {
        fs.writeFileSync(
            path.join(webLibDir, "deployments.json"),
            JSON.stringify(deployments, null, 2)
        );
        console.log("Saved deployments to frontend apps/web/src/lib/deployments.json");
    }

    console.log("Deployment complete.");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
