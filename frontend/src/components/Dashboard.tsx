import { useAccount } from 'wagmi'
import { useIsMember, useVotingPower, useContribution, useContributionTier, useMemberLTV, useTokenBalance, useMemberCount, useTotalContributions } from '../hooks/useContractRead'
import { formatUnits, getTierInfo, shortenAddress } from '../lib/utils'
import { Users, TrendingUp, Wallet, Vote, Zap, Shield, Sparkles } from 'lucide-react'
import { MemberRegistration } from './MemberRegistration'

export function Dashboard() {
  const { address, isConnected } = useAccount()

  const { data: isMember } = useIsMember(address)
  const { data: votingPower } = useVotingPower(address)
  const { data: contribution } = useContribution(address)
  const { data: contributionTier } = useContributionTier(address)
  const { data: ltv } = useMemberLTV(address)
  const { data: tokenBalance } = useTokenBalance(address)
  const { data: memberCount } = useMemberCount()
  const { data: totalContributions } = useTotalContributions()

  const tierInfo = contributionTier !== undefined ? getTierInfo(contributionTier) : null

  if (!isConnected) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <div className="text-center glass-card p-12 rounded-3xl">
          <div className="relative inline-block mb-6">
            <Wallet className="w-20 h-20 text-sky-400 mx-auto animate-float" />
            <div className="absolute inset-0 blur-xl bg-sky-400/30 rounded-full" />
          </div>
          <h2 className="text-2xl font-bold gradient-text mb-3">Connect Your Wallet</h2>
          <p className="text-gray-400">Please connect your wallet to view your dashboard</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="glass-card p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-sky-500/20 to-purple-500/20 rounded-full blur-3xl" />
        <div className="relative">
          <div className="flex items-center gap-3 mb-2">
            <Sparkles className="w-6 h-6 text-sky-400" />
            <h2 className="text-3xl font-bold gradient-text">Welcome back!</h2>
          </div>
          <p className="text-gray-400 text-lg">{shortenAddress(address || '')}</p>
        </div>
      </div>

      {/* Member Registration */}
      <MemberRegistration />

      {/* Member Status Banner */}
      {isMember === true && (
        <div className="glass-card p-6 border border-green-500/30 bg-gradient-to-r from-green-500/10 to-emerald-500/10">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-500/20 rounded-xl">
              <Shield className="w-6 h-6 text-green-400" />
            </div>
            <div>
              <p className="text-green-400 font-semibold text-lg">Active Member</p>
              <p className="text-gray-400 text-sm">You have full voting rights and can access all services</p>
            </div>
          </div>
        </div>
      )}

      {/* Personal Stats */}
      <div>
        <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
          <Zap className="w-5 h-5 text-sky-400" />
          Your Overview
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Voting Power */}
          <StatCard
            title="Voting Power"
            value={votingPower !== undefined && votingPower > 0n ? '1' : '0'}
            subtitle="1 member = 1 vote"
            icon={<Vote className="w-5 h-5 text-sky-400" />}
          />

          {/* Contribution Tier */}
          <StatCard
            title="Contribution Tier"
            value={tierInfo?.name || 'None'}
            subtitle={tierInfo ? `${tierInfo.ltv * 100}% max LTV` : 'Not a member'}
            icon={<TrendingUp className="w-5 h-5 text-purple-400" />}
            badgeColor={tierInfo?.color}
          />

          {/* Your Deposits */}
          <StatCard
            title="Your Deposits"
            value={contribution !== undefined ? `${Number(formatUnits(contribution, 6)).toFixed(2)} USDC` : '0 USDC'}
            subtitle="Total contributed"
            icon={<Wallet className="w-5 h-5 text-emerald-400" />}
          />

          {/* Token Balance */}
          <StatCard
            title="Token Balance"
            value={tokenBalance !== undefined ? `${Number(formatUnits(tokenBalance, 18)).toFixed(2)} LAK` : '0 LAK'}
            subtitle="Membership tokens"
            icon={<Sparkles className="w-5 h-5 text-pink-400" />}
          />
        </div>
      </div>

      {/* Protocol Stats */}
      <div>
        <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
          <Users className="w-5 h-5 text-sky-400" />
          Protocol Statistics
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Total Members */}
          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-sky-500/20 rounded-xl">
                <Users className="w-6 h-6 text-sky-400" />
              </div>
              <span className="text-3xl font-bold text-sky-400">
                {memberCount !== undefined ? memberCount.toString() : '0'}
              </span>
            </div>
            <h4 className="text-lg font-semibold text-white mb-1">Total Members</h4>
            <p className="text-gray-400 text-sm">Registered cooperative members</p>
          </div>

          {/* Total Contributions */}
          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-purple-500/20 rounded-xl">
                <TrendingUp className="w-6 h-6 text-purple-400" />
              </div>
              <span className="text-3xl font-bold text-purple-400">
                {totalContributions !== undefined ? `${Number(formatUnits(totalContributions, 6)).toLocaleString()} USDC` : '0 USDC'}
              </span>
            </div>
            <h4 className="text-lg font-semibold text-white mb-1">Total Contributions</h4>
            <p className="text-gray-400 text-sm">Combined member deposits</p>
          </div>
        </div>
      </div>
    </div>
  )
}

function StatCard({
  title,
  value,
  subtitle,
  icon,
  badgeColor,
}: {
  title: string
  value: string
  subtitle: string
  icon: React.ReactNode
  badgeColor?: string
}) {
  return (
    <div className="glass-card p-6 group">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-white/5 rounded-lg group-hover:scale-110 transition-transform">
          {icon}
        </div>
        <h4 className="text-sm font-medium text-gray-400">{title}</h4>
      </div>
      <div className="stat-value text-2xl mb-1">{value}</div>
      <p className="text-xs text-gray-500">{subtitle}</p>
    </div>
  )
}
