import { useState } from 'react';
import { ArbeitsrapportForm } from '@/components/ArbeitsrapportForm';

const Index = () => {
  return (
    <div className="min-h-screen p-4 pb-24">
      <div className="max-w-[500px] mx-auto">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-semibold mb-1">🔧 Arbeitsrapport</h1>
          <p className="text-sm text-muted-foreground">Erfasse deine Arbeit schnell und einfach</p>
        </div>
        <ArbeitsrapportForm />
      </div>
    </div>
  );
};

export default Index;
