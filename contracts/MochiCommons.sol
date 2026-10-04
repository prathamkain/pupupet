// SPDX-License-Identifier: MIT
pragma solidity ^0.8.34;

import {DigitalPet} from "./DigitalPet.sol";

/// @title MochiCommons
/// @notice Personal pets plus a shared, gas-sponsored community care loop.
/// @dev A member is counted once per smart account; every care action is recorded.
contract MochiCommons is DigitalPet {
    uint32 public constant COMMUNITY_WEEKLY_GOAL = 100;
    uint32 public constant CARES_PER_LEVEL = 25;

    uint32 public totalCommunityCare;
    uint32 public communityMemberCount;

    mapping(address member => uint64 day) public lastCommunityCareDay;
    mapping(address member => uint32 count) public communityCareCount;
    mapping(address member => uint32 streak) public communityStreak;
    mapping(address member => bool joined) private countedCommunityMember;
    mapping(uint64 week => uint32 count) public communityCareByWeek;

    event CommunityCare(
        address indexed member,
        uint64 indexed day,
        uint32 streak,
        uint32 memberCareCount,
        uint32 totalCare,
        uint32 weeklyCare
    );
    event CommunityLevelUp(uint32 indexed level, uint32 totalCare);

    /// @notice Add one care point to the shared pet. Multiple actions per day are allowed.
    /// @dev With SmoothSend, msg.sender is the member's smart account.
    function careTogether() external {
        uint64 day = uint64(block.timestamp / 1 days);
        if (!countedCommunityMember[msg.sender]) {
            countedCommunityMember[msg.sender] = true;
            communityMemberCount += 1;
        }

        uint64 week = uint64(block.timestamp / 1 weeks);
        uint32 previousLevel = communityLevel();

        uint64 previousDay = lastCommunityCareDay[msg.sender];
        if (previousDay != day) {
            if (previousDay + 1 == day) {
                communityStreak[msg.sender] += 1;
            } else {
                communityStreak[msg.sender] = 1;
            }
            lastCommunityCareDay[msg.sender] = day;
        }

        communityCareCount[msg.sender] += 1;
        totalCommunityCare += 1;
        communityCareByWeek[week] += 1;

        emit CommunityCare(
            msg.sender,
            day,
            communityStreak[msg.sender],
            communityCareCount[msg.sender],
            totalCommunityCare,
            communityCareByWeek[week]
        );

        uint32 newLevel = communityLevel();
        if (newLevel > previousLevel) {
            emit CommunityLevelUp(newLevel, totalCommunityCare);
        }
    }

    /// @notice Shared pet level grows with every community care contribution.
    function communityLevel() public view returns (uint32) {
        return totalCommunityCare / CARES_PER_LEVEL + 1;
    }

    function getCommunityStats()
        external
        view
        returns (uint32 totalCare, uint32 members, uint32 thisWeek, uint32 level, uint32 weeklyGoal)
    {
        uint64 week = uint64(block.timestamp / 1 weeks);
        return (
            totalCommunityCare,
            communityMemberCount,
            communityCareByWeek[week],
            communityLevel(),
            COMMUNITY_WEEKLY_GOAL
        );
    }

    function getCommunityMember(address member)
        external
        view
        returns (uint32 streak, uint32 careCount, bool caredToday)
    {
        uint64 today = uint64(block.timestamp / 1 days);
        return (
            communityStreak[member],
            communityCareCount[member],
            lastCommunityCareDay[member] == today
        );
    }
}
