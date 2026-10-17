'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminUsersRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/setup?tab=users');
  }, [router]);

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6">
      <div className="text-center space-y-2">
        <div className="w-8 h-8 border-3 border-purple-700 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs text-slate-500 font-medium">Opening User Management &amp; RBAC...</p>
      </div>
    </div>
  );
}
