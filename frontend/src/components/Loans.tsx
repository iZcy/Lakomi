import { useState } from 'react'
import { useAccount } from 'wagmi'
import { useIsMember, useContribution, useContributionTier, useMemberLTV, useActiveLoanCount, useLoan } from '../hooks/useContractRead'
import { useRepayLoan } from '../hooks/useContractWrite'
import { formatUnits, parseUnits, getTierInfo } from '../lib/utils'
import { DollarSign, TrendingUp, AlertCircle, Shield, Calculator } from 'lucide-react'
import { MemberRegistration } from './MemberRegistration'

export function Loans() {
  const { address, isConnected } = useAccount()
  const [loanAmount, setLoanAmount] = useState('')
  const [collateralAmount, setCollateralAmount] = useState('')

  const { data: isMember } = useIsMember(address)
  const { data: contribution } = useContribution(address)
  const { data: contributionTier } = useContributionTier(address)
  const { data: ltv } = useMemberLTV(address)
  const { data: activeLoanCount } = useActiveLoanCount()

  const tierInfo = contributionTier !== undefined ? getTierInfo(contributionTier) : null
  const maxLoan = collateralAmount && ltv
    ? parseUnits(collateralAmount) * BigInt(ltv) / 100n
    : 0n

  if (!isConnected) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <div className="glass-card p-12 text-center">
          <DollarSign className="w-16 h-16 text-gray-500 mx-auto mb-4" />
          <p className="text-gray-400 text-lg">Please connect your wallet to manage loans</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="glass-card p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-emerald-500/10 to-teal-500/10 rounded-full blur-3xl" />
        <div className="relative">
          <h2 className="text-3xl font-bold gradient-text mb-2">Emergency Loans</h2>
          <p className="text-gray-400 text-lg">Borrow against your collateral. Higher tiers get better LTV ratios.</p>
        </div>
      </div>

      {!isMember ? (
        <MemberRegistration />
      ) : (
        <>
          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* LTV Ratio */}
            <div className="glass-card p-6 group">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-emerald-500/20 rounded-xl group-hover:scale-110 transition-transform">
                  <TrendingUp className="w-6 h-6 text-emerald-400" />
                </div>
                <h3 className="text-sm font-medium text-gray-400">Your LTV Ratio</h3>
              </div>
              <div className="text-3xl font-bold text-emerald-400 mb-1">
                {ltv !== undefined ? `${ltv.toString()}%` : '0%'}
              </div>
              <p className="text-xs text-gray-500">Based on {tierInfo?.name || 'Unknown'}</p>
            </div>

            {/* Contribution */}
            <div className="glass-card p-6 group">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-purple-500/20 rounded-xl group-hover:scale-110 transition-transform">
                  <Shield className="w-6 h-6 text-purple-400" />
                </div>
                <h3 className="text-sm font-medium text-gray-400">Your Contribution</h3>
              </div>
              <div className="text-3xl font-bold text-white mb-1">
                {contribution !== undefined ? `${Number(formatUnits(contribution, 6)).toLocaleString()} USDC` : '0 USDC'}
              </div>
              <p className="text-xs text-gray-500">Total deposited</p>
            </div>

            {/* Active Loans */}
            <div className="glass-card p-6 group">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-pink-500/20 rounded-xl group-hover:scale-110 transition-transform">
                  <Calculator className="w-6 h-6 text-pink-400" />
                </div>
                <h3 className="text-sm font-medium text-gray-400">Active Loans</h3>
              </div>
              <div className="text-3xl font-bold text-white mb-1">
                {activeLoanCount?.toString() || '0'}
              </div>
              <p className="text-xs text-gray-500">Currently active</p>
            </div>
          </div>

          {/* Tiered LTV Info */}
          <div className="glass-card p-8">
            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-400" />
              Tiered LTV System
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <LTVTier
                tier={1}
                name="Starter"
                ltv={30}
                color="from-slate-500 to-gray-500"
                current={contributionTier !== undefined && contributionTier >= 1}
              />
              <LTVTier
                tier={2}
                name="Moderate"
                ltv={50}
                color="from-sky-500 to-blue-500"
                current={contributionTier !== undefined && contributionTier >= 2}
              />
              <LTVTier
                tier={3}
                name="Premium"
                ltv={70}
                color="from-purple-500 to-pink-500"
                current={contributionTier !== undefined && contributionTier >= 3}
              />
            </div>
          </div>

          {/* Loan Calculator */}
          <div className="glass-card p-8">
            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <Calculator className="w-5 h-5 text-sky-400" />
              Loan Calculator
            </h3>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Collateral Amount (USDC)
                </label>
                <input
                  type="number"
                  value={collateralAmount}
                  onChange={(e) => setCollateralAmount(e.target.value)}
                  placeholder="Enter collateral amount..."
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
                />
              </div>

              {maxLoan > 0n && (
                <div className="glass-card p-6 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/20">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-400 mb-1">Maximum Loan Amount</p>
                      <p className="text-2xl font-bold text-emerald-400">
                        {Number(formatUnits(maxLoan, 6)).toLocaleString()} USDC
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-400 mb-1">At {ltv}% LTV</p>
                      <p className="text-xs text-gray-500">Based on your tier</p>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Loan Amount (USDC)
                </label>
                <input
                  type="number"
                  value={loanAmount}
                  onChange={(e) => setLoanAmount(e.target.value)}
                  placeholder="Enter loan amount..."
                  max={maxLoan > 0n ? Number(formatUnits(maxLoan, 6)) : undefined}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
                />
                {maxLoan > 0n && (
                  <p className="text-xs text-gray-500 mt-2">
                    Maximum: {Number(formatUnits(maxLoan, 6)).toLocaleString()} USDC
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Info Alert */}
          <div className="glass-card p-6 border border-amber-500/30 bg-gradient-to-r from-amber-500/10 to-orange-500/10">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-amber-500/20 rounded-lg">
                <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0" />
              </div>
              <div>
                <h4 className="font-semibold text-amber-400 mb-1">Loan Terms</h4>
                <ul className="text-sm text-gray-400 space-y-1">
                  <li>• Interest rate: 5% APY</li>
                  <li>• Collateral locked until repayment</li>
                  <li>• Auto-approval for eligible members</li>
                  <li>• Partial repayments allowed</li>
                </ul>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function LTVTier({
  tier,
  name,
  ltv,
  color,
  current,
}: {
  tier: number
  name: string
  ltv: number
  color: string
  current: boolean
}) {
  return (
    <div className={`glass-card p-6 ${current ? 'border-2 border-sky-500/50' : ''}`}>
      <div className="flex items-center justify-between mb-4">
        <div className={`px-3 py-1 rounded-full text-xs font-bold ${current ? 'bg-sky-500 text-white' : 'bg-gray-500/20 text-gray-400'}`}>
          Tier {tier}
        </div>
        {current && (
          <div className="flex items-center gap-1 text-sky-400 text-xs font-semibold">
            <Shield className="w-3 h-3" />
            Current
          </div>
        )}
      </div>
      <h4 className="text-lg font-bold text-white mb-2">{name}</h4>
      <div className={`text-3xl font-bold bg-gradient-to-r ${color} bg-clip-text text-transparent mb-2`}>
        {ltv}%
      </div>
      <p className="text-xs text-gray-500">Maximum LTV</p>
    </div>
  )
}
