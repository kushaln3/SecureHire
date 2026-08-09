import { expect } from "chai";
import { ethers, run } from "hardhat";
import { Identity } from "@semaphore-protocol/identity";
import { generateProof } from "@semaphore-protocol/proof";
import { Group } from "@semaphore-protocol/group";

describe("Credential system e2e", function () {
    let semaphoreAddress: string;
    let courseRegistry: any;
    let credentialIssuer: any;
    let credentialVerifier: any;
    let deployer: any;
    let universityAdmin: any;

    before(async function () {
        [deployer, universityAdmin] = await ethers.getSigners();

        // Deploy Semaphore locally using hardhat plugin
        const { semaphore } = await run("deploy:semaphore");
        semaphoreAddress = await semaphore.getAddress();

        const CourseRegistry = await ethers.getContractFactory("CourseRegistry");
        courseRegistry = await CourseRegistry.deploy();
        await courseRegistry.waitForDeployment();
        const courseRegistryAddress = await courseRegistry.getAddress();

        const CredentialIssuer = await ethers.getContractFactory("CredentialIssuer");
        credentialIssuer = await CredentialIssuer.deploy(semaphoreAddress, courseRegistryAddress);
        await credentialIssuer.waitForDeployment();
        const credentialIssuerAddress = await credentialIssuer.getAddress();

        await courseRegistry.setIssuer(credentialIssuerAddress);

        const CredentialVerifier = await ethers.getContractFactory("CredentialVerifier");
        credentialVerifier = await CredentialVerifier.deploy(semaphoreAddress, courseRegistryAddress);
        await credentialVerifier.waitForDeployment();
    });

    it("should complete the full flow", async function () {
        // 1. Register a university
        await credentialIssuer.connect(universityAdmin).requestRegistration("IITG", "meta");
        let uni = await credentialIssuer.getUniversity(universityAdmin.address);
        expect(uni.approved).to.be.false;

        // 2. Approve university
        await credentialIssuer.connect(deployer).approveUniversity(universityAdmin.address);
        uni = await credentialIssuer.getUniversity(universityAdmin.address);
        expect(uni.approved).to.be.true;

        // 3. Create course
        const tx = await credentialIssuer.connect(universityAdmin).createCourse("DSAI Minor", "DSAI001");
        const receipt = await tx.wait();
        const event = receipt.logs.find((log: any) => {
            try {
                return credentialIssuer.interface.parseLog(log)?.name === "CourseCreated";
            } catch { return false; }
        });
        const parsedLog = credentialIssuer.interface.parseLog(event);
        const groupId = parsedLog.args.groupId;

        // 4. Create identity and issue credential
        const identity = new Identity();
        await credentialIssuer.connect(universityAdmin).issueCredential(groupId, identity.commitment);

        // 5. Generate ZK proof
        const group = new Group(groupId.toString());
        group.addMember(identity.commitment.toString());
        
        const message = 12345;
        const scope = groupId.toString();
        const proof = await generateProof(identity, group, message, scope);

        // 6. Verify proof via CredentialVerifier
        await expect(credentialVerifier.verifyCredential(
            {
                merkleTreeDepth: proof.merkleTreeDepth,
                merkleTreeRoot: proof.merkleTreeRoot,
                nullifier: proof.nullifier,
                message: proof.message,
                scope: proof.scope,
                points: proof.points
            }, 
            groupId
        )).to.emit(credentialVerifier, "CredentialVerified")
          .withArgs(groupId, proof.nullifier, proof.message, true);

        // 7. Double spend should fail
        await expect(credentialVerifier.verifyCredential(
            {
                merkleTreeDepth: proof.merkleTreeDepth,
                merkleTreeRoot: proof.merkleTreeRoot,
                nullifier: proof.nullifier,
                message: proof.message,
                scope: proof.scope,
                points: proof.points
            }, 
            groupId
        )).to.be.revertedWith("Nullifier already used");
    });
});
