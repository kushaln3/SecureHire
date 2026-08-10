import { expect } from "chai";
import { ethers, run } from "hardhat";
import { Identity } from "@semaphore-protocol/identity";
import { generateProof } from "@semaphore-protocol/proof";
import { Group } from "@semaphore-protocol/group";

describe("Eternity-ID Robust Backend Test Suite", function () {
    let semaphoreAddress: string;
    let courseRegistry: any;
    let credentialIssuer: any;
    let credentialVerifier: any;
    let deployer: any;
    let universityAdmin: any;
    let unauthorizedUser: any;
    let studentIdentity: Identity;
    let testGroupId: bigint;

    before(async function () {
        [deployer, universityAdmin, unauthorizedUser] = await ethers.getSigners();

        // 1. Deploy Semaphore locally using hardhat plugin
        const { semaphore } = await run("deploy:semaphore");
        semaphoreAddress = await semaphore.getAddress();

        // 2. Deploy CourseRegistry
        const CourseRegistry = await ethers.getContractFactory("CourseRegistry");
        courseRegistry = await CourseRegistry.deploy();
        await courseRegistry.waitForDeployment();
        const courseRegistryAddress = await courseRegistry.getAddress();

        // 3. Deploy CredentialIssuer
        const CredentialIssuer = await ethers.getContractFactory("CredentialIssuer");
        credentialIssuer = await CredentialIssuer.deploy(semaphoreAddress, courseRegistryAddress);
        await credentialIssuer.waitForDeployment();
        const credentialIssuerAddress = await credentialIssuer.getAddress();

        // Set issuer link
        await courseRegistry.setIssuer(credentialIssuerAddress);

        // 4. Deploy CredentialVerifier
        const CredentialVerifier = await ethers.getContractFactory("CredentialVerifier");
        credentialVerifier = await CredentialVerifier.deploy(semaphoreAddress, courseRegistryAddress);
        await credentialVerifier.waitForDeployment();

        studentIdentity = new Identity();
    });

    describe("1. Access Control & Registration State Machine", function () {
        it("SC-01: Unauthorized account cannot create course or issue credential", async function () {
            await expect(
                credentialIssuer.connect(unauthorizedUser).createCourse("Unauthorized Course", "UNAUTH01")
            ).to.be.revertedWithCustomError(credentialIssuer, "AccessControlUnauthorizedAccount");

            await expect(
                credentialIssuer.connect(unauthorizedUser).issueCredential(1, studentIdentity.commitment)
            ).to.be.revertedWithCustomError(credentialIssuer, "AccessControlUnauthorizedAccount");
        });

        it("SC-02: University can request registration", async function () {
            await expect(
                credentialIssuer.connect(universityAdmin).requestRegistration("IIT Guwahati", "dept=CSE")
            ).to.emit(credentialIssuer, "RegistrationRequested")
             .withArgs(universityAdmin.address, "IIT Guwahati", "dept=CSE");

            const uni = await credentialIssuer.getUniversity(universityAdmin.address);
            expect(uni.name).to.equal("IIT Guwahati");
            expect(uni.approved).to.be.false;
            expect(await credentialIssuer.isUniversity(universityAdmin.address)).to.be.false;
        });

        it("SC-04: Cannot request registration twice for same wallet", async function () {
            await expect(
                credentialIssuer.connect(universityAdmin).requestRegistration("IIT Guwahati Dup", "dept=CSE")
            ).to.be.revertedWith("Already registered");
        });

        it("SC-03: Admin can approve registered university", async function () {
            await expect(
                credentialIssuer.connect(deployer).approveUniversity(universityAdmin.address)
            ).to.emit(credentialIssuer, "UniversityApproved")
             .withArgs(universityAdmin.address, "IIT Guwahati");

            const uni = await credentialIssuer.getUniversity(universityAdmin.address);
            expect(uni.approved).to.be.true;
            expect(await credentialIssuer.isUniversity(universityAdmin.address)).to.be.true;
        });

        it("SC-04b: Non-admin cannot approve university", async function () {
            await expect(
                credentialIssuer.connect(unauthorizedUser).approveUniversity(unauthorizedUser.address)
            ).to.be.revertedWithCustomError(credentialIssuer, "AccessControlUnauthorizedAccount");
        });
    });

    describe("2. Course Management & Registry Lookup", function () {
        it("SC-05: Approved university can create course and initialize Semaphore group", async function () {
            const tx = await credentialIssuer.connect(universityAdmin).createCourse("DSAI Minor", "DSAI001");
            const receipt = await tx.wait();
            
            const event = receipt.logs.find((log: any) => {
                try {
                    return credentialIssuer.interface.parseLog(log)?.name === "CourseCreated";
                } catch { return false; }
            });
            const parsedLog = credentialIssuer.interface.parseLog(event);
            testGroupId = parsedLog.args.groupId;

            expect(testGroupId).to.be.gte(0);

            // Verify CourseRegistry state
            const course = await courseRegistry.getCourse(testGroupId);
            expect(course.name).to.equal("DSAI Minor");
            expect(course.code).to.equal("DSAI001");
            expect(course.university).to.equal(universityAdmin.address);
            expect(course.active).to.be.true;

            expect(await courseRegistry.isValidCourse(testGroupId)).to.be.true;
            expect(await courseRegistry.courseCodeToGroupId("DSAI001")).to.equal(testGroupId);
        });

        it("SC-06: Creating a course with duplicate code reverts", async function () {
            await expect(
                credentialIssuer.connect(universityAdmin).createCourse("Duplicate DSAI", "DSAI001")
            ).to.be.revertedWith("Course code already exists");
        });

        it("SC-08: Registry returns all registered course group IDs", async function () {
            const groupIds = await courseRegistry.getAllGroupIds();
            expect(groupIds.length).to.be.gte(1);
            expect(groupIds[0]).to.equal(testGroupId);
        });
    });

    describe("3. Credential Issuance & Zero-Knowledge Verification", function () {
        it("SC-07: University issues credential by adding commitment to group", async function () {
            await expect(
                credentialIssuer.connect(universityAdmin).issueCredential(testGroupId, studentIdentity.commitment)
            ).to.emit(credentialIssuer, "CredentialIssued");

            const count = await credentialIssuer.credentialCount(testGroupId);
            expect(count).to.equal(1);
        });

        it("SEC-02: Verifying credential against unregistered group ID reverts", async function () {
            const fakeGroupId = 99999;
            const dummyProof = {
                merkleTreeDepth: 20,
                merkleTreeRoot: "12345",
                nullifier: "67890",
                message: "1",
                scope: "100",
                points: ["1", "2", "3", "4", "5", "6", "7", "8"]
            };

            await expect(
                credentialVerifier.verifyCredential(dummyProof, fakeGroupId)
            ).to.be.revertedWith("Invalid course");
        });

        it("ZK & SEC-01: Valid ZK Proof verification & Replay Attack Prevention", async function () {
            // Reconstruct Semaphore Group off-chain
            const group = new Group();
            group.addMember(studentIdentity.commitment.toString());

            const message = 1; // Verified Signal
            const scope = testGroupId.toString();

            // Generate ZK-SNARK Proof (Groth16)
            const proof = await generateProof(studentIdentity, group, message, scope);

            const proofStruct = {
                merkleTreeDepth: proof.merkleTreeDepth,
                merkleTreeRoot: proof.merkleTreeRoot,
                nullifier: proof.nullifier,
                message: proof.message,
                scope: proof.scope,
                points: proof.points
            };

            // 1st Verification - Must Succeed
            await expect(credentialVerifier.verifyCredential(proofStruct, testGroupId))
                .to.emit(credentialVerifier, "CredentialVerified")
                .withArgs(testGroupId, proof.nullifier, proof.message, true);

            expect(await credentialVerifier.isNullifierUsed(proof.nullifier)).to.be.true;

            // 2nd Verification (REPLAY ATTACK) - Must Revert
            await expect(credentialVerifier.verifyCredential(proofStruct, testGroupId))
                .to.be.revertedWith("Nullifier already used");
        });
    });
});
