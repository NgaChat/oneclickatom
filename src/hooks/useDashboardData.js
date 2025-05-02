import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { refreshAccessToken, getCommonHeaders } from '../services/service';
import { listenForRefresh } from '../utils/eventEmitter';

export const useDashboardData = (userData, updateUserData) => {
  const [data, setData] = useState([]);
  const [loadingState, setLoadingState] = useState({
    isLoading: false,
    progress: { current: 0, total: 0, message: '' }
  });

  const hasFetchedRef = useRef(false); // Prevent repeated fetching

  // Main fetch function with loading
  const fetchData = useCallback(
    async (dataToFetch = [], forceRefresh = false) => {
      if (!dataToFetch?.length) return;

      setLoadingState({
        isLoading: true,
        progress: { current: 0, total: dataToFetch.length, message: 'Starting...' }
      });

      try {
        const updatedData = await Promise.all(
          dataToFetch.map(async (item, index) => {
            setLoadingState(prev => ({
              ...prev,
              progress: {
                current: index + 1,
                total: dataToFetch.length,
                message: `Updating ${index + 1}/${dataToFetch.length}`
              }
            }));

            try {
              const attribute = await refreshAccessToken(item, forceRefresh);
              const headers = await getCommonHeaders(attribute.token || item.token);

              const dashboardRes = await axios.get(
                'https://store.atom.com.mm/mytmapi/v1/my/point-system/dashboard',
                {
                  params: { msisdn: item.msisdn, userid: item.user_id, v: '4.11' },
                  headers
                }
              );

              const profileRes = await axios.get(
                'https://store.atom.com.mm/mytmapi/v1/my/lightweight-balance',
                {
                  params: { msisdn: item.msisdn, userid: item.user_id, v: '4.11' },
                  headers
                }
              );

              console.log('point', dashboardRes.data?.data?.attribute?.totalPoint)
              return {
                ...attribute,
                mainBalance: profileRes.data?.data?.attribute?.mainBalance || {
                  availableTotalBalance: 0,
                  currency: 'Ks'
                },
                totalPoint: dashboardRes.data?.data?.attribute?.totalPoint || 0
              };
            } catch (error) {
              console.warn(`[Account Update Failed] ${item.msisdn}: ${error.message}`);
              return {
                ...item,
                hasError: true,
                errorMessage: 'Update failed'
              };
            }
          })
        );

        setData(updatedData);
        await updateUserData(updatedData);
      } catch (error) {
        console.error('[Global Fetch Error]:', error);
      } finally {
        setLoadingState({
          isLoading: false,
          progress: { current: 0, total: 0, message: '' }
        });
      }
    },
    [updateUserData]
  );

  // Background fetch function (no loading state updates)
  const backgroundRefresh = useCallback(
    async (dataToFetch = [], forceRefresh = false) => {
      if (!dataToFetch?.length) return;

      try {
        const updatedData = await Promise.all(
          dataToFetch.map(async (item) => {
            try {
              const attribute = await refreshAccessToken(item, forceRefresh);
              const headers = await getCommonHeaders(attribute.token || item.token);

              const dashboardRes = await axios.get(
                'https://store.atom.com.mm/mytmapi/v1/my/dashboard?isFirstTime=1',
                {
                  params: { msisdn: item.msisdn, userid: item.user_id, v: '4.11' },
                  headers,
                  timeout: 10000
                }
              );

              const profileRes = await axios.get(
                'https://store.atom.com.mm/mytmapi/v1/my/lightweight-balance',
                {
                  params: { msisdn: item.msisdn, userid: item.user_id, v: '4.11' },
                  headers,
                  timeout: 10000
                }
              );

              return {
                ...attribute,
                mainBalance: profileRes.data?.data?.attribute?.mainBalance || {
                  availableTotalBalance: 0,
                  currency: 'Ks'
                },
                totalPoint: dashboardRes.data?.data?.attribute?.starInfo?.totalPoint || 0
              };
            } catch (error) {
              console.warn(`[Background Update Failed] ${item.msisdn}: ${error.message}`);
              return {
                ...item,
                hasError: true,
                errorMessage: 'Background update failed'
              };
            }
          })
        );

        setData(updatedData);
        await updateUserData(updatedData);
      } catch (error) {
        console.error('[Background Refresh Error]:', error);
      }
    },
    [updateUserData]
  );

  useEffect(() => {
    if (userData?.length && !hasFetchedRef.current) {
      hasFetchedRef.current = true;
      fetchData(userData);
    }

    const unsubscribe = listenForRefresh(() => {
      backgroundRefresh(userData, true); // only background refresh on event
    });
    return unsubscribe;
  }, [userData, fetchData, backgroundRefresh]);

  return { data, setData, loadingState, fetchData, backgroundRefresh };
};
