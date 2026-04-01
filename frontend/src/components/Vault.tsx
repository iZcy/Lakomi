import { useState } from 'react'
import { useAccount } from 'wagmi'
import { useIsMember, useContribution, useContributionTier, useAvailableLiquidity } from '../hooks/useContractRead'
import { useDeposit, useRequestWithdrawal } from '../hooks/useContractWrite'
import { useApproveUsdc } from '../hooks/useContractWrite'
import { formatUnits, parseUnits, getTierInfo } from '../lib/utils'
import { TrendingUp, ArrowDown, ArrowUp, Wallet, Gem, Coins } from 'lucide-react'
import { MemberRegistration } from './MemberRegistration'

export function Vault() {
  const { address, isConnected } = useAccount()
  const [depositAmount, setDepositAmount] = useState('')
  const [withdrawAmount, setWithdrawAmount] = useState('')

  const { data: isMember } = useIsMember(address)
  const { data: contribution } = useContribution(address)
  const { data: contributionTier } = useContributionTier(address)
  const { data: availableLiquidity } = useAvailableLiquidity()

  const { deposit, isPending: isDepositing, isSuccess: depositSuccess } = useDeposit()
  const { requestWithdrawal, isPending: isWithdrawing, isSuccess: withdrawSuccess } = useRequestWithdrawal()
  const { approve: approveUsdc, isPending: isApproving } = useApproveUsdc()

  const tierInfo = contributionTier !== undefined ? getTierInfo(contributionTier) : null

  const handleDeposit = async () => {
    if (!depositAmount) return

    try {
      const amount = parseUnits(depositAmount)
      await approveUsdc(amount)
      await deposit(amount)
      setDepositAmount('')
    } catch (error) {
      console.error('Error depositing:', error)
    }
  }

  const handleWithdraw = async () => {
    if (!withdrawAmount) return

    try {
      const amount = parseUnits(withdrawAmount)
      await requestWithdrawal(amount)
      setWithdrawAmount('')
    } catch (error) {
      console.error('Error withdrawing:', error)
    }
  }

  if (!isConnected) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <div className="glass-card p-12 text-center">
          <Wallet className="w-16 h-16 text-gray-500 mx-auto mb-4" />
          <p className="text-gray-400 text-lg">Please connect your wallet to manage contributions</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="glass-card p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-full blur-3xl" />
        <div className="relative">
          <h2 className="text-3xl font-bold gradient-text mb-2">Vault</h2>
          <p className="text-gray-400 text-lg">Contribute USDC to earn reputation and unlock better loan terms.</p>
        </div>
      </div>

      {!isMember ? (
        <MemberRegistration />
      ) : (
        <>
          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Your Contribution */}
            <div className="glass-card p-6 group">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-sky-500/20 rounded-xl group-hover:scale-110 transition-transform">
                  <Coins className="w-6 h-6 text-sky-400" />
                </div>
                <h3 className="text-sm font-medium text-gray-400">Your Contribution</h3>
              </div>
              <div className="text-3xl font-bold text-white mb-1">
                {contribution !== undefined ? `${Number(formatUnits(contribution, 6)).toLocaleString()} USDC` : '0 USDC'}
              </div>
              <p className="text-xs text-gray-500">Total deposited</p>
            </div>

            {/* Contribution Tier */}
            <div className="glass-card p-6 group">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-purple-500/20 rounded-xl group-hover:scale-110 transition-transform">
                  <Gem className="w-6 h-6 text-purple-400" />
                </div>
                <h3 className="text-sm font-medium text-gray-400">Contribution Tier</h3>
              </div>
              <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-lg font-bold ${tierInfo?.color || 'bg-gray-500/20 text-gray-400'}`}>
                {tierInfo?.name || 'None'}
              </div>
              <p className="text-xs text-gray-500 mt-2">{tierInfo ? `${tierInfo.ltv * 100}% max LTV` : 'Not a member'}</p>
            </div>

            {/* Available Liquidity */}
            <div className="glass-card p-6 group">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-emerald-500/20 rounded-xl group-hover:scale-110 transition-transform">
                  <TrendingUp className="w-6 h-6 text-emerald-400" />
                </div>
                <h3 className="text-sm font-medium text-gray-400">Available Liquidity</h3>
              </div>
              <div className="text-3xl font-bold text-white mb-1">
                {availableLiquidity !== undefined ? `${Number(formatUnits(availableLiquidity, 6)).toLocaleString()} USDC` : '0 USDC'}
              </div>
              <p className="text-xs text-gray-500">Protocol liquidity</p>
            </div>
          </div>

          {/* Tier Progress */}
          {tierInfo && (
            <div className="glass-card p-8">
              <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-purple-400" />
                Tier Progress
              </h3>
              <div className="space-y-4">
                <TierProgress
                  tier={1}
                  current={contribution !== undefined ? Number(formatUnits(contribution, 6)) : 0}
                  threshold={500}
                  active={contributionTier !== undefined && contributionTier >= 1}
                />
                <TierProgress
                  tier={2}
                  current={contribution !== undefined ? Number(formatUnits(contribution, 6)) : 0}
                  threshold={2000}
                  active={contributionTier !== undefined && contributionTier >= 2}
                />
                <TierProgress
                  tier={3}
                  current={contribution !== undefined ? Number(formatUnits(contribution, 6)) : 0}
                  threshold={Infinity}
                  active={contributionTier !== undefined && contributionTier >= 3}
                  isHighest
                />
              </div>
            </div>
          )}

          {/* Deposit & Withdraw */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Deposit */}
            <div className="glass-card p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-green-500/20 rounded-xl">
                  <ArrowDown className="w-6 h-6 text-green-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Deposit USDC</h3>
                  <p className="text-sm text-gray-400">Increase your contribution tier</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Amount (USDC)</label>
                  <input
                    type="number"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    placeholder="Enter amount..."
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
                  />
                </div>
                <button
                  onClick={handleDeposit}
                  disabled={!depositAmount || isDepositing || isApproving}
                  className="glow-button w-full px-6 py-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-bold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <ArrowDown className="w-4 h-4" />
                  {isApproving ? 'Approving...' : isDepositing ? 'Depositing...' : 'Deposit'}
                </button>
                {depositSuccess && (
                  <p className="text-green-400 text-sm text-center">Deposit successful!</p>
                )}
              </div>
            </div>

            {/* Withdraw */}
            <div className="glass-card p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-red-500/20 rounded-xl">
                  <ArrowUp className="w-6 h-6 text-red-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Withdraw USDC</h3>
                  <p className="text-sm text-gray-400">Request withdrawal (may have timelock)</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Amount (USDC)</label>
                  <input
                    type="number"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    placeholder="Enter amount..."
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
                  />
                </div>
                <button
                  onClick={handleWithdraw}
                  disabled={!withdrawAmount || isWithdrawing}
                  className="glow-button w-full px-6 py-4 bg-gradient-to-r from-red-500 to-pink-500 text-white font-bold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <ArrowUp className="w-4 h-4" />
                  {isWithdrawing ? 'Withdrawing...' : 'Withdraw'}
                </button>
                {withdrawSuccess && (
                  <p className="text-green-400 text-sm text-center">Withdrawal requested!</p>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function TierProgress({
  tier,
  current,
  threshold,
  active,
  isHighest = false,
}: {
  tier: number
  current: number
  threshold: number
  active: boolean
  isHighest?: boolean
}) {
  const progress = isHighest
    ? (active ? 100 : 0)
    : Math.min((current / threshold) * 100, 100)

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span className={`font-semibold ${active ? 'text-white' : 'text-gray-500'}`}>
          Tier {tier}
        </span>
        <span className="text-gray-400">
          {!isHighest && `${current.toLocaleString()} / ${threshold.toLocaleString()} USDC`}
          {isHighest && active && `${current.toLocaleString()}+ USDC`}
          {isHighest && !active && `${current.toLocaleString()} / 2000+ USDC`}
        </span>
      </div>
      <div className="h-3 bg-white/10 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-500 ${
            active
              ? 'bg-gradient-to-r from-purple-500 to-pink-500'
              : 'bg-gradient-to-r from-gray-600 to-gray-700'
          }`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  )
}
