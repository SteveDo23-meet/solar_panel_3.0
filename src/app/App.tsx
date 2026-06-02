import { motion } from 'framer-motion';
import { AnalysisFilters } from '../components/dashboard/AnalysisFilters';
import { EnergyChart } from '../components/dashboard/EnergyChart';
import { GenerateReportButton } from '../components/dashboard/GenerateReportButton';
import { MultiAreaComparison } from '../components/dashboard/MultiAreaComparison';
import { RankingTable } from '../components/dashboard/RankingTable';
import { ScoringSettings } from '../components/dashboard/ScoringSettings';
import { ScoreBreakdown } from '../components/dashboard/ScoreBreakdown';
import { SolarTimelineControls } from '../components/dashboard/SolarTimelineControls';
import { StatsCards } from '../components/dashboard/StatsCards';
import { TopLocations } from '../components/dashboard/TopLocations';
import { Header } from '../components/layout/Header';
import { MainLayout } from '../components/layout/MainLayout';
import { SolarMap } from '../components/map/SolarMap';

export const App: React.FC = () => {
  return (
    <MainLayout>
      <SolarMap />

      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28 }}
        className="pointer-events-none absolute left-4 top-4 z-30 w-[min(430px,calc(100vw-2rem))]"
      >
        <Header className="pointer-events-auto" />
      </motion.div>

      <motion.aside
        initial={{ opacity: 0, x: 18 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.28, delay: 0.08 }}
        className="absolute bottom-4 right-4 top-4 z-30 hidden w-[360px] overflow-x-hidden overflow-y-auto rounded-lg md:block"
      >
        <div className="w-full min-w-0 space-y-3 pr-1">
          <GenerateReportButton />
          <AnalysisFilters />
          <ScoringSettings />
          <StatsCards />
          <MultiAreaComparison />
          <TopLocations limit={3} />
          <ScoreBreakdown />
          <SolarTimelineControls />
          <EnergyChart chartType="area" />
          <RankingTable />
        </div>
      </motion.aside>

      <motion.section
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28, delay: 0.12 }}
        className="absolute inset-x-3 bottom-3 z-30 max-h-[42vh] overflow-y-auto md:hidden"
      >
        <div className="space-y-3">
          <ScoringSettings />
          <StatsCards />
          <MultiAreaComparison />
          <TopLocations limit={2} />
        </div>
      </motion.section>
    </MainLayout>
  );
};
