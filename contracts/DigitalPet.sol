// SPDX-License-Identifier: MIT
pragma solidity ^0.8.34;

/// @title DigitalPet
/// @notice A no-token pet whose care actions are on-chain transactions.
/// @dev Ownership is keyed by msg.sender. With SmoothSend ERC-4337 writes,
///      msg.sender is the user's SmoothSend smart account.
contract DigitalPet {
    uint8 private constant MAX_STAT = 100;
    uint64 private constant HUNGER_INTERVAL = 1 hours;
    uint64 private constant HAPPINESS_DECAY_INTERVAL = 3 hours;

    error PetAlreadyExists();
    error PetNotCreated();

    struct Pet {
        uint8 hunger;
        uint8 happiness;
        uint64 createdAt;
        uint64 lastFedAt;
        uint64 lastPlayedAt;
        uint64 lastHungerUpdateAt;
        uint64 lastHappinessUpdateAt;
        uint32 careActions;
        bool exists;
    }

    struct PetView {
        bool exists;
        uint8 hunger;
        uint8 happiness;
        uint64 createdAt;
        uint64 lastFedAt;
        uint64 lastPlayedAt;
        uint32 careActions;
    }

    mapping(address owner => Pet pet) private pets;

    event PetCreated(address indexed owner, uint64 createdAt);
    event PetFed(address indexed owner, uint8 hunger, uint8 happiness);
    event PetPlayed(address indexed owner, uint8 hunger, uint8 happiness);

    function createPet() external {
        Pet storage pet = pets[msg.sender];
        if (pet.exists) revert PetAlreadyExists();

        uint64 now64 = uint64(block.timestamp);
        pet.hunger = 0;
        pet.happiness = 50;
        pet.createdAt = now64;
        pet.lastFedAt = now64;
        pet.lastPlayedAt = now64;
        pet.lastHungerUpdateAt = now64;
        pet.lastHappinessUpdateAt = now64;
        pet.exists = true;

        emit PetCreated(msg.sender, now64);
    }

    function feed() external {
        Pet storage pet = pets[msg.sender];
        if (!pet.exists) revert PetNotCreated();

        _refresh(pet);
        uint64 now64 = uint64(block.timestamp);
        pet.hunger = 0;
        pet.happiness = _addCapped(pet.happiness, 5);
        pet.lastFedAt = now64;
        pet.lastHungerUpdateAt = now64;
        pet.lastHappinessUpdateAt = now64;
        pet.careActions += 1;

        emit PetFed(msg.sender, pet.hunger, pet.happiness);
    }

    function play() external {
        Pet storage pet = pets[msg.sender];
        if (!pet.exists) revert PetNotCreated();

        _refresh(pet);
        uint64 now64 = uint64(block.timestamp);
        pet.hunger = _addCapped(pet.hunger, 10);
        pet.happiness = _addCapped(pet.happiness, 15);
        pet.lastPlayedAt = now64;
        pet.lastHungerUpdateAt = now64;
        pet.lastHappinessUpdateAt = now64;
        pet.careActions += 1;

        emit PetPlayed(msg.sender, pet.hunger, pet.happiness);
    }

    /// @notice Return live stats for any pet owner, including time-based decay.
    function getPet(address owner) external view returns (PetView memory viewData) {
        Pet storage pet = pets[owner];
        if (!pet.exists) return viewData;

        (uint8 hunger, uint8 happiness) = _preview(pet);
        viewData = PetView({
            exists: true,
            hunger: hunger,
            happiness: happiness,
            createdAt: pet.createdAt,
            lastFedAt: pet.lastFedAt,
            lastPlayedAt: pet.lastPlayedAt,
            careActions: pet.careActions
        });
    }

    function _refresh(Pet storage pet) private {
        uint256 hungerHours = (block.timestamp - pet.lastHungerUpdateAt) / HUNGER_INTERVAL;
        if (hungerHours > 0) {
            pet.hunger = _addCapped(pet.hunger, hungerHours);
            pet.lastHungerUpdateAt += uint64(hungerHours * HUNGER_INTERVAL);
        }

        uint256 happinessPeriods =
            (block.timestamp - pet.lastHappinessUpdateAt) / HAPPINESS_DECAY_INTERVAL;
        if (happinessPeriods > 0) {
            pet.happiness = happinessPeriods >= pet.happiness
                ? 0
                : pet.happiness - uint8(happinessPeriods);
            pet.lastHappinessUpdateAt += uint64(happinessPeriods * HAPPINESS_DECAY_INTERVAL);
        }
    }

    function _preview(Pet storage pet) private view returns (uint8 hunger, uint8 happiness) {
        uint256 hungerHours = (block.timestamp - pet.lastHungerUpdateAt) / HUNGER_INTERVAL;
        uint256 hungerValue = uint256(pet.hunger) + hungerHours;
        hunger = hungerValue > MAX_STAT ? MAX_STAT : uint8(hungerValue);

        uint256 happinessPeriods =
            (block.timestamp - pet.lastHappinessUpdateAt) / HAPPINESS_DECAY_INTERVAL;
        happiness = happinessPeriods >= pet.happiness
            ? 0
            : pet.happiness - uint8(happinessPeriods);
    }

    function _addCapped(uint8 value, uint256 amount) private pure returns (uint8) {
        uint256 result = uint256(value) + amount;
        return result > MAX_STAT ? MAX_STAT : uint8(result);
    }
}
