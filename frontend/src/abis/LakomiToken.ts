export const LAKOMI_TOKEN_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address) view returns (uint256)",
  "function transfer(address,uint256) returns (bool)",
  "function registerMember(address)",
  "function isRegisteredMember(address) view returns (bool)",
  "function getMemberCount() view returns (uint256)",
  "function getVotingPower(address) view returns (uint256)",
  "event MemberRegistered(address indexed member, uint256 timestamp)",
] as const
