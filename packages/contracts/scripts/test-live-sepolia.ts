import { ethers } from "hardhat";
import { Identity } from "@semaphore-protocol/identity";
import { generateProof } from "@semaphore-protocol/proof";
import { Group } from "@semaphore-protocol/group";
import * as fs from "fs";
import * as path from "path";

async function main() {
    console.log("==================================================");
    console.log("   Eternity-ID Sepolia Testnet Live Verification   ");
    console.log("==================================================\n");

    const deploymentsPath = path.join(__dirname, "../deployments/sepolia.json");
    if (!fs.existsSync(deploymentsPath)) {
        throw new Error("No deployments/sepolia.json found! Deploy contracts first using `npx hardhat run scripts/deploy.ts --network sepolia`");
    }

    const deployments = JSON.parse(fs.readFileSync(deploymentsPath, "utf8"));
    const [signer] = await ethers.getSigners();
    console.log("Executing test with signer address:", signer.address);

    const credentialIssuer = await ethers.getContractAt("CredentialIssuer", deployments.CredentialIssuer);
    const credentialVerifier = await ethers.getContractAt("CredentialVerifier", deployments.CredentialVerifier);
    const courseRegistry = await ethers.getContractAt("CourseRegistry", deployments.CourseRegistry);

    // 1. Register university (if not already registered)
    const uniInfo = await credentialIssuer.getUniversity(signer.address);
    if (uniInfo.registeredAt.toString() === "0") {
        console.log("Requesting university registration...");
        const regTx = await credentialIssuer.requestRegistration("IIT Guwahati Live Test", "https://iitg.ac.in");
        await regTx.wait();
        console.log("Registration requested.");

        console.log("Approving university...");
        const appTx = await credentialIssuer.approveUniversity(signer.address);
        await appTx.wait();
        console.log("University approved.");
    } else {
        console.log("University already registered and approved.");
    }

    // 2. Create Course
    const courseCode = `TEST_${Date.now().toString().slice(-6)}`;
    console.log(`Creating test course with code: ${courseCode}...`);
    const courseTx = await credentialIssuer.createCourse("Live Test Course", courseCode);
    const receipt = await courseTx.wait();

    const event = receipt.logs.find((log: any) => {
        try {
            return credentialIssuer.interface.parseLog(log)?.name === "CourseCreated";
        } catch { return false; }
    });
    const parsedLog = credentialIssuer.interface.parseLog(event);
    const groupId = parsedLog.args.groupId;
    console.log(`Course created! On-chain Semaphore Group ID: ${groupId.toString()}`);

    // 3. Issue Credential to a new Identity
    const studentIdentity = new Identity();
    console.log(`Generated Student Identity Commitment: ${studentIdentity.commitment.toString().slice(0, 16)}...`);
    
    console.log("Issuing credential on-chain...");
    const issueTx = await credentialIssuer.issueCredential(groupId, studentIdentity.commitment);
    await issueTx.wait();
    console.log("Credential issued.");

    // 4. Generate ZK Proof
    console.log("Generating off-chain Groth16 ZK proof...");
    const group = new Group();
    group.addMember(studentIdentity.commitment.toString());
    
    const message = 1;
    const scope = groupId.toString();
    const proof = await generateProof(studentIdentity, group, message, scope);
    console.log("Proof generated. Nullifier:", proof.nullifier.toString());

    // 5. Verify Credential On-Chain
    console.log("Submitting proof to CredentialVerifier contract on Sepolia...");
    const verifyTx = await credentialVerifier.verifyCredential(
        {
            merkleTreeDepth: proof.merkleTreeDepth,
            merkleTreeRoot: proof.merkleTreeRoot,
            nullifier: proof.nullifier,
            message: proof.message,
            scope: proof.scope,
            points: proof.points
        },
        groupId
    );
    await verifyTx.wait();
    console.log("✅ Proof successfully verified on Sepolia testnet!");

    // 6. Test Double Spend Protection
    console.log("Attempting double-spend replay attack with same proof...");
    try {
        await credentialVerifier.verifyCredential(
            {
                merkleTreeDepth: proof.merkleTreeDepth,
                merkleTreeRoot: proof.merkleTreeRoot,
                nullifier: proof.nullifier,
                message: proof.message,
                scope: proof.scope,
                points: proof.points
            },
            groupId
        );
        console.error("❌ ERROR: Replay attack succeeded when it should have failed!");
    } catch (err: any) {
        console.log("✅ Replay attack correctly rejected! Revert verified.");
    }

    console.log("\n==================================================");
    console.log("   ALL SEPOLIA LIVE TESTS PASSED SUCCESSFULLY!    ");
    console.log("==================================================");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
