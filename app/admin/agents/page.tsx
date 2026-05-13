'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminAgentsRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace('/brain'); }, [router]);
  return null;
}
