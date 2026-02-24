// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title LakomiToken
 * @author Lakomi Protocol
 * @notice Governance token for the Lakomi community platform
 * @dev ERC-20 token with voting power, collateral locking, and access control
 *
 * Key Features:
 * - 1 token = 1 vote
 * - Tokens can be locked as loan collateral
 * - Minted when members join, burned when they exit
 * - Role-based access control for minting/burning/locking
 */
contract LakomiToken is ERC20, AccessControl, ReentrancyGuard {

    // ============================================================
    //                        ROLES
    // ============================================================

    /// @dev Role for minting tokens (admin or governance)
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    /// @dev Role for burning tokens (when members exit)
    bytes32 public constant BURNER_ROLE = keccak256("BURNER_ROLE");

    /// @dev Role for locking/unlocking tokens (LakomiLoans contract)
    bytes32 public constant LOCKER_ROLE = keccak256("LOCKER_ROLE");

    // ============================================================
    //                      STATE VARIABLES
    // ============================================================

    /// @dev Maximum supply cap
    uint256 public constant MAX_SUPPLY = 1_000_000 * 10**18;

    /// @dev Tokens locked as collateral for loans
    mapping(address => uint256) private _lockedBalances;

    /// @dev Whether token transfers are enabled
    bool public transfersEnabled;

    /// @dev LakomiVault contract address
    address public lakomiVault;

    /// @dev LakomiGovern contract address
    address public lakomiGovern;

    /// @dev LakomiLoans contract address
    address public lakomiLoans;

    /// @dev Default tokens minted to new members
    uint256 public constant DEFAULT_MINT_AMOUNT = 100 * 10**18;

    // ============================================================
    //                        EVENTS
    // ============================================================

    event TokensMinted(address indexed to, uint256 amount, uint256 timestamp);
    event TokensBurned(address indexed from, uint256 amount, uint256 timestamp);
    event TokensLocked(address indexed account, uint256 amount, uint256 timestamp);
    event TokensUnlocked(address indexed account, uint256 amount, uint256 timestamp);
    event TransfersToggled(bool enabled, address indexed by);
    event VaultSet(address indexed vault);
    event GovernSet(address indexed govern);
    event LoansSet(address indexed loans);

    // ============================================================
    //                        ERRORS
    // ============================================================

    error LakomiToken__ZeroAddress();
    error LakomiToken__InsufficientBalance();
    error LakomiToken__ExceedsMaxSupply();
    error LakomiToken__TransfersDisabled();
    error LakomiToken__InsufficientUnlockedTokens();
    error LakomiToken__NothingToUnlock();
    error LakomiToken__AlreadySet();

    // ============================================================
    //                      CONSTRUCTOR
    // ============================================================

    /**
     * @dev Grants DEFAULT_ADMIN_ROLE to deployer
     */
    constructor() ERC20("Lakomi Token", "LAK") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
        _grantRole(BURNER_ROLE, msg.sender);
        transfersEnabled = true;
    }

    // ============================================================
    //                    CORE FUNCTIONS
    // ============================================================

    /**
     * @notice Mints governance tokens to a new member
     * @dev Only callable by MINTER_ROLE
     * @param to The recipient address
     * @param amount The amount to mint
     */
    function mint(address to, uint256 amount)
        external
        onlyRole(MINTER_ROLE)
        nonReentrant
    {
        if (to == address(0)) revert LakomiToken__ZeroAddress();
        if (totalSupply() + amount > MAX_SUPPLY) revert LakomiToken__ExceedsMaxSupply();

        _mint(to, amount);
        emit TokensMinted(to, amount, block.timestamp);
    }

    /**
     * @notice Mints default tokens to a new member
     * @dev Convenience function for standard membership
     * @param to The recipient address
     */
    function mintDefault(address to)
        external
        onlyRole(MINTER_ROLE)
        nonReentrant
    {
        if (to == address(0)) revert LakomiToken__ZeroAddress();
        if (totalSupply() + DEFAULT_MINT_AMOUNT > MAX_SUPPLY)
            revert LakomiToken__ExceedsMaxSupply();

        _mint(to, DEFAULT_MINT_AMOUNT);
        emit TokensMinted(to, DEFAULT_MINT_AMOUNT, block.timestamp);
    }

    /**
     * @notice Burns tokens when a member exits
     * @dev Only callable by BURNER_ROLE
     * @param from The address to burn from
     * @param amount The amount to burn
     */
    function burn(address from, uint256 amount)
        external
        onlyRole(BURNER_ROLE)
        nonReentrant
    {
        if (from == address(0)) revert LakomiToken__ZeroAddress();
        if (balanceOf(from) < amount) revert LakomiToken__InsufficientBalance();

        _burn(from, amount);
        emit TokensBurned(from, amount, block.timestamp);
    }

    /**
     * @notice Locks tokens as collateral for a loan
     * @dev Only callable by LOCKER_ROLE (LakomiLoans)
     * @param account The address to lock tokens from
     * @param amount The amount to lock
     */
    function lockTokens(address account, uint256 amount)
        external
        onlyRole(LOCKER_ROLE)
        nonReentrant
    {
        if (account == address(0)) revert LakomiToken__ZeroAddress();
        if (balanceOf(account) - _lockedBalances[account] < amount)
            revert LakomiToken__InsufficientUnlockedTokens();

        _lockedBalances[account] += amount;
        emit TokensLocked(account, amount, block.timestamp);
    }

    /**
     * @notice Unlocks tokens after loan repayment
     * @dev Only callable by LOCKER_ROLE (LakomiLoans)
     * @param account The address to unlock tokens for
     * @param amount The amount to unlock
     */
    function unlockTokens(address account, uint256 amount)
        external
        onlyRole(LOCKER_ROLE)
        nonReentrant
    {
        if (account == address(0)) revert LakomiToken__ZeroAddress();
        if (_lockedBalances[account] < amount) revert LakomiToken__NothingToUnlock();

        _lockedBalances[account] -= amount;
        emit TokensUnlocked(account, amount, block.timestamp);
    }

    // ============================================================
    //                    VIEW FUNCTIONS
    // ============================================================

    /**
     * @notice Gets the locked token balance for an account
     * @param account The address to query
     * @return The locked token amount
     */
    function getLockedBalance(address account) external view returns (uint256) {
        return _lockedBalances[account];
    }

    /**
     * @notice Gets the available (unlocked) balance for voting/transfer
     * @param account The address to query
     * @return The available balance
     */
    function getAvailableBalance(address account) external view returns (uint256) {
        return balanceOf(account) - _lockedBalances[account];
    }

    /**
     * @notice Gets voting power (same as available balance)
     * @param account The address to query
     * @return The voting power
     */
    function getVotingPower(address account) external view returns (uint256) {
        return balanceOf(account) - _lockedBalances[account];
    }

    // ============================================================
    //                  ADMIN FUNCTIONS
    // ============================================================

    /**
     * @notice Enables or disables token transfers
     * @dev Only callable by DEFAULT_ADMIN_ROLE
     * @param enabled The new transfer state
     */
    function setTransfersEnabled(bool enabled)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        transfersEnabled = enabled;
        emit TransfersToggled(enabled, msg.sender);
    }

    /**
     * @notice Sets the LakomiVault contract address
     * @dev Only callable by DEFAULT_ADMIN_ROLE
     * @param vault The vault address
     */
    function setLakomiVault(address vault)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        if (vault == address(0)) revert LakomiToken__ZeroAddress();
        if (lakomiVault != address(0)) revert LakomiToken__AlreadySet();
        lakomiVault = vault;
        emit VaultSet(vault);
    }

    /**
     * @notice Sets the LakomiGovern contract address
     * @dev Only callable by DEFAULT_ADMIN_ROLE
     * @param govern The governance address
     */
    function setLakomiGovern(address govern)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        if (govern == address(0)) revert LakomiToken__ZeroAddress();
        if (lakomiGovern != address(0)) revert LakomiToken__AlreadySet();
        lakomiGovern = govern;
        emit GovernSet(govern);
    }

    /**
     * @notice Sets the LakomiLoans contract address
     * @dev Only callable by DEFAULT_ADMIN_ROLE
     * @param loans The loans contract address
     */
    function setLakomiLoans(address loans)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        if (loans == address(0)) revert LakomiToken__ZeroAddress();
        if (lakomiLoans != address(0)) revert LakomiToken__AlreadySet();
        lakomiLoans = loans;
        emit LoansSet(loans);
    }

    // ============================================================
    //                    OVERRIDES
    // ============================================================

    /**
     * @dev Override to check transfers are enabled
     */
    function _update(address from, address to, uint256 value)
        internal
        override
    {
        super._update(from, to, value);

        // Allow minting (from == 0) and burning (to == 0) regardless
        if (from != address(0) && to != address(0)) {
            if (!transfersEnabled) revert LakomiToken__TransfersDisabled();
        }
    }

    /**
     * @dev Override transfer to check unlocked balance
     */
    function transfer(address to, uint256 value)
        public
        override
        returns (bool)
    {
        if (balanceOf(msg.sender) - _lockedBalances[msg.sender] < value)
            revert LakomiToken__InsufficientUnlockedTokens();
        return super.transfer(to, value);
    }

    /**
     * @dev Override transferFrom to check unlocked balance
     */
    function transferFrom(address from, address to, uint256 value)
        public
        override
        returns (bool)
    {
        if (balanceOf(from) - _lockedBalances[from] < value)
            revert LakomiToken__InsufficientUnlockedTokens();
        return super.transferFrom(from, to, value);
    }
}
