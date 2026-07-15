import { useState } from 'react';
import { PageHeader } from '@/shared/components/PageHeader';
import { SectionTabs } from '@/shared/components/SectionTabs';
import { Users, ArrowLeftCircle } from 'lucide-react';

import { MembersTab } from './MembersTab';
import { RefundsTab } from './RefundsTab';

type TabType = 'members' | 'refunds';

export function Members() {
  const [activeTab, setActiveTab] = useState<TabType>('members');

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Socios"
        description="Gestión de miembros de la cooperativa"
      />

      <SectionTabs
        ariaLabel="Secciones de socios"
        selectedKey={activeTab}
        onSelectionChange={(key) => setActiveTab(key as TabType)}
        tabs={[
          { id: 'members', label: 'Socios', icon: <Users className="size-4" /> },
          { id: 'refunds', label: 'Devoluciones', icon: <ArrowLeftCircle className="size-4" /> },
        ]}
      />

      {activeTab === 'members' ? <MembersTab /> : <RefundsTab />}
    </div>
  );
}

export default Members;
