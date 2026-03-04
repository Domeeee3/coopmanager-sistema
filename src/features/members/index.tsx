import React, { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/shared/ui/tabs';
import { Users, ArrowLeftCircle } from 'lucide-react';

import { MembersTab } from './MembersTab';
import { RefundsTab } from './RefundsTab';

type TabType = 'members' | 'refunds';

export function Members() {
  const [activeTab, setActiveTab] = useState<TabType>('members');

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Título */}
      <div className="flex items-center gap-2">
        <div className="p-2 rounded-full bg-blue-100">
          <Users className="w-6 h-6 text-blue-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Socios</h1>
          <p className="text-muted-foreground mt-1">Gestión de miembros de la cooperativa</p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabType)}>
        <TabsList>
          <TabsTrigger value="members">
            <Users className="w-4 h-4 mr-1.5" />
            Socios
          </TabsTrigger>
          <TabsTrigger value="refunds">
            <ArrowLeftCircle className="w-4 h-4 mr-1.5" />
            Devoluciones
          </TabsTrigger>
        </TabsList>

        <TabsContent value="members">
          <MembersTab />
        </TabsContent>

        <TabsContent value="refunds">
          <RefundsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default Members;
