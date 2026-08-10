'use client';
import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { CONTRACTS, CREDENTIAL_ISSUER_ABI, RPC_URL } from '../contracts';

export interface Course {
  groupId: number;
  name: string;
  code: string;
}

export interface University {
  address: string;
  name: string;
  courses: Course[];
}

let cache: University[] | null = null;

export function useUniversities() {
  const [universities, setUniversities] = useState<University[]>(cache ?? []);
  const [loading, setLoading] = useState(!cache);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = async () => {
    setLoading(true);
    setError(null);
    try {
      const provider = new ethers.JsonRpcProvider(RPC_URL);
      const contract = new ethers.Contract(CONTRACTS.credentialIssuer, CREDENTIAL_ISSUER_ABI, provider);

      // 1. Get all approved universities from events
      const approvedFilter = contract.filters.UniversityApproved();
      const approvedEvents = await contract.queryFilter(approvedFilter, -49000);

      // Deduplicate by address (take latest approval)
      const uniMap = new Map<string, string>(); // address -> name
      for (const ev of approvedEvents) {
        if ('args' in ev) {
          uniMap.set((ev.args[0] as string).toLowerCase(), ev.args[1] as string);
        }
      }

      // 2. Get all courses from events
      const courseFilter = contract.filters.CourseCreated();
      const courseEvents = await contract.queryFilter(courseFilter, -49000);

      // Group courses by university address
      const coursesByUni = new Map<string, Course[]>();
      for (const ev of courseEvents) {
        if ('args' in ev) {
          const groupId = Number(ev.args[0]);
          const name = ev.args[1] as string;
          const code = ev.args[2] as string;
          const uniAddr = (ev.args[3] as string).toLowerCase();
          if (!coursesByUni.has(uniAddr)) coursesByUni.set(uniAddr, []);
          coursesByUni.get(uniAddr)!.push({ groupId, name, code });
        }
      }

      // 3. Assemble
      const result: University[] = Array.from(uniMap.entries()).map(([addr, name]) => ({
        address: addr,
        name,
        courses: coursesByUni.get(addr) ?? [],
      }));

      cache = result;
      setUniversities(result);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to fetch universities');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!cache) fetchAll();
  }, []);

  return { universities, loading, error, refresh: fetchAll };
}
