import { useAccount } from 'wagmi'
import { useIsMember } from '../hooks/useContractRead'
import { useRegisterMember } from '../hooks/useContractWrite'
import { UserPlus, CheckCircle2, Vote, TrendingUp, Shield } from 'lucide-react'

export function MemberRegistration() {
  const { address, isConnected } = useAccount()
  const { data: isMember } = useIsMember(address)
  const { registerMember, isPending, isSuccess, error } = useRegisterMember()

  const handleRegister = async () => {
    if (!address) return

    try {
      await registerMember(address)
    } catch (err) {
      console.error('Error registering:', err)
    }
  }

  if (!isConnected || isMember === undefined || isMember === true) {
    return null
  }

  return (
    <div className="glass-card p-8 border border-sky-500/30 bg-gradient-to-br from-sky-500/10 to-purple-500/10 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-sky-500/20 to-purple-500/20 rounded-full blur-3xl" />
      <div className="relative">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-sky-500/20 rounded-xl">
            <UserPlus className="w-8 h-8 text-sky-400" />
          </div>
          <div>
            <h3 className="text-2xl font-bold gradient-text">Join the Cooperative</h3>
            <p className="text-gray-400">Become a member and unlock all features</p>
          </div>
        </div>

        <p className="text-gray-300 mb-6">
          Become a member to start contributing, voting on proposals, and accessing loans.
          Membership is free and open to everyone.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <BenefitCard
            icon={<Vote className="w-5 h-5 text-sky-400" />}
            title="Equal Voting"
            description="1 member = 1 vote"
          />
          <BenefitCard
            icon={<TrendingUp className="w-5 h-5 text-purple-400" />}
            title="Tiered LTV"
            description="Up to 70% LTV"
          />
          <BenefitCard
            icon={<Shield className="w-5 h-5 text-emerald-400" />}
            title="Governance"
            description="Democratic control"
          />
        </div>

        <button
          onClick={handleRegister}
          disabled={isPending}
          className="glow-button w-full px-8 py-4 bg-gradient-to-r from-sky-500 to-purple-500 text-white font-bold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <UserPlus className="w-5 h-5" />
          {isPending ? 'Registering...' : 'Register as Member'}
        </button>

        {isSuccess && (
          <div className="mt-4 flex items-center gap-2 text-green-400 bg-green-500/10 p-4 rounded-xl border border-green-500/20">
            <CheckCircle2 className="w-5 h-5" />
            <span className="font-medium">Welcome to Lakomi Cooperative!</span>
          </div>
        )}

        {error && (
          <div className="mt-4 text-red-400 text-sm bg-red-500/10 p-4 rounded-xl border border-red-500/20">
            Error: {error.message}
          </div>
        )}
      </div>
    </div>
  )
}

function BenefitCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode
  title: string
  description: string
}) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <h4 className="font-semibold text-white text-sm">{title}</h4>
      </div>
      <p className="text-xs text-gray-400">{description}</p>
    </div>
  )
}
