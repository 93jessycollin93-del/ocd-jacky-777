import { useState, useEffect, useCallback } from 'react';

export function useWallet() {
  const [account, setAccount] = useState(null);
  const [chainId, setChainId] = useState(null);
  const [status, setStatus] = useState('disconnected'); // 'disconnected' | 'connecting' | 'connected' | 'unavailable'

  useEffect(() => {
    if (!window.ethereum) { setStatus('unavailable'); return; }
    // Check if already connected
    window.ethereum.request({ method: 'eth_accounts' }).then(accounts => {
      if (accounts.length > 0) {
        setAccount(accounts[0]);
        setStatus('connected');
      }
    });
    window.ethereum.request({ method: 'eth_chainId' }).then(id => setChainId(id));

    const onAccounts = (accounts) => {
      setAccount(accounts[0] || null);
      setStatus(accounts.length > 0 ? 'connected' : 'disconnected');
    };
    const onChain = (id) => setChainId(id);

    window.ethereum.on('accountsChanged', onAccounts);
    window.ethereum.on('chainChanged', onChain);
    return () => {
      window.ethereum.removeListener('accountsChanged', onAccounts);
      window.ethereum.removeListener('chainChanged', onChain);
    };
  }, []);

  const connect = useCallback(async () => {
    if (!window.ethereum) { setStatus('unavailable'); return; }
    setStatus('connecting');
    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      setAccount(accounts[0]);
      setStatus('connected');
    } catch {
      setStatus('disconnected');
    }
  }, []);

  const disconnect = useCallback(() => {
    setAccount(null);
    setStatus('disconnected');
  }, []);

  const shortAddress = account ? `${account.slice(0, 6)}…${account.slice(-4)}` : null;
  const networkName = chainId === '0x1' ? 'Ethereum'
    : chainId === '0x89' ? 'Polygon'
    : chainId === '0x2105' ? 'Base'
    : chainId ? `Chain ${parseInt(chainId, 16)}`
    : null;

  return { account, chainId, networkName, status, shortAddress, connect, disconnect };
}