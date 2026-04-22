import React from 'react';

/**
 * Editorial-style landing mock that emphasizes due dates, clarity, and payoff momentum
 * instead of reading like a dense admin dashboard.
 */
export default function HeroDashboardMock() {
  return (
    <div className="rounded-[1.5rem] border border-[#e0d6c8] bg-[#fffdf8] p-4 text-[#1f2b24] sm:p-5">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between rounded-[1.25rem] border border-[#e7ddcf] bg-[#f7f1e6] px-4 py-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-[#8a7356]">This week at a glance</p>
            <p className="mt-1 text-sm font-semibold text-[#1f2b24]">You have a clear plan for the next 7 days</p>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full bg-[#e4efe5] px-3 py-1 text-[11px] font-medium text-[#35684f]">
            <span className="h-2 w-2 rounded-full bg-[#35684f]" aria-hidden />
            Updated
          </span>
        </div>

        <div className="grid gap-3 md:grid-cols-[1.08fr_0.92fr]">
          <div className="rounded-[1.4rem] border border-[#e7ddcf] bg-[#fcf7ef] p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-[0.18em] text-[#8a7356]">Due next</p>
                <p className="mt-1 text-xl font-semibold tracking-[-0.03em] text-[#1f2b24]">$842.00</p>
              </div>
              <div className="rounded-full bg-[#f1e7d9] px-3 py-1 text-[11px] font-medium text-[#7b6548]">3 obligations</div>
            </div>

            <div className="mt-4 space-y-3">
              {[
                ['Rent', 'Tomorrow', '$1,200', 'bg-[#f4ecdf] text-[#7c6647]'],
                ['Car insurance', 'Friday', '$148', 'bg-[#eef4ef] text-[#35684f]'],
                ['Phone', 'Monday', '$92', 'bg-[#f4ecdf] text-[#7c6647]'],
              ].map(([name, when, value, tone]) => (
                <div key={name} className="flex items-center justify-between rounded-2xl border border-[#e7ddcf] bg-white px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-[#1f2b24]">{name}</p>
                    <p className="mt-1 text-xs text-[#6a766d]">{when}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${tone}`}>
                      scheduled
                    </span>
                    <span className="text-sm font-semibold text-[#1f2b24]">{value}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <div className="rounded-[1.4rem] border border-[#e7ddcf] bg-[#fcf7ef] p-4">
              <p className="text-[10px] uppercase tracking-[0.18em] text-[#8a7356]">Payoff momentum</p>
              <p className="mt-2 text-lg font-semibold text-[#1f2b24]">Debt-free target: Feb 2027</p>
              <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-[#e7ddcf]">
                <div className="h-full w-[64%] rounded-full bg-[#35684f]" />
              </div>
              <div className="mt-3 flex items-center justify-between text-xs text-[#667268]">
                <span>64% plan confidence</span>
                <span>$183 extra this month</span>
              </div>
            </div>

            <div className="rounded-[1.4rem] border border-[#e7ddcf] bg-[#fcf7ef] p-4">
              <p className="text-[10px] uppercase tracking-[0.18em] text-[#8a7356]">Safe to move</p>
              <p className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-[#1f2b24]">$1,184</p>
              <p className="mt-2 text-sm leading-6 text-[#617067]">
                After upcoming bills, minimum debt payments, and your tax reserve.
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-[0.88fr_1.12fr]">
          <div className="rounded-[1.4rem] border border-[#e7ddcf] bg-[#fcf7ef] p-4">
            <p className="text-[10px] uppercase tracking-[0.18em] text-[#8a7356]">Reserve health</p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-white p-3">
                <p className="text-xs text-[#6b776e]">Tax reserve</p>
                <p className="mt-2 text-lg font-semibold text-[#1f2b24]">$1,539</p>
              </div>
              <div className="rounded-2xl bg-white p-3">
                <p className="text-xs text-[#6b776e]">Emergency buffer</p>
                <p className="mt-2 text-lg font-semibold text-[#1f2b24]">$3,200</p>
              </div>
            </div>
          </div>

          <div className="rounded-[1.4rem] border border-[#e7ddcf] bg-[#fcf7ef] p-4">
            <div className="flex items-center justify-between">
              <p className="text-[10px] uppercase tracking-[0.18em] text-[#8a7356]">Net worth trend</p>
              <p className="text-xs font-medium text-[#35684f]">+18.4% in 8 months</p>
            </div>
            <div className="mt-5 flex h-24 items-end gap-2">
              {[22, 28, 35, 39, 46, 54, 60, 70].map((height, index) => (
                <div
                  key={index}
                  className="flex-1 rounded-t-[0.85rem] bg-[linear-gradient(180deg,_rgba(53,104,79,0.22),_rgba(53,104,79,0.75))]"
                  style={{ height: `${height}%` }}
                  aria-hidden
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
