// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "@openzeppelin/contracts/access/Ownable.sol";

struct Course {
    string name;
    string code;
    uint256 groupId;
    address university;
    bool active;
}

contract CourseRegistry is Ownable {
    mapping(uint256 => Course) public courses;
    mapping(string => uint256) public courseCodeToGroupId;
    mapping(string => bool) public courseCodeExists;
    mapping(uint256 => bool) public groupExists;

    uint256[] public allGroupIds;
    uint256 public courseCount;
    address public issuer;

    modifier onlyIssuer() {
        require(msg.sender == issuer, "Not the issuer");
        _;
    }

    constructor() Ownable(msg.sender) {}

    function setIssuer(address _issuer) external onlyOwner {
        issuer = _issuer;
    }

    function addCourse(string memory name, string memory code, uint256 groupId, address university) external onlyIssuer {
        require(!groupExists[groupId], "Course already exists for this group");
        require(!courseCodeExists[code], "Course code already exists");

        courses[groupId] = Course({
            name: name,
            code: code,
            groupId: groupId,
            university: university,
            active: true
        });

        groupExists[groupId] = true;
        courseCodeExists[code] = true;
        courseCodeToGroupId[code] = groupId;
        allGroupIds.push(groupId);
        courseCount++;
    }

    function getCourse(uint256 groupId) external view returns (Course memory) {
        return courses[groupId];
    }

    function getAllGroupIds() external view returns (uint256[] memory) {
        return allGroupIds;
    }

    function isValidCourse(uint256 groupId) external view returns (bool) {
        return groupExists[groupId] && courses[groupId].active;
    }

    function deactivateCourse(uint256 groupId) external onlyIssuer {
        require(groupExists[groupId], "Course does not exist");
        courses[groupId].active = false;
    }
}
