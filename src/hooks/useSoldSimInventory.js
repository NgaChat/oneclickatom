import { useState, useCallback, useRef, useEffect, useContext } from 'react';
import { Alert } from 'react-native';
import {
  getAllSoldSims,
  addToSoldInventory,
  saveFirebaseSoldSim,
  getCommonHeaders
} from '../services/service';
import { AlertContext } from '../utils/alertUtils';
import axios from 'axios';

// API Configuration
const API_CONFIG = {
  version: '4.11',
  baseUrl: 'https://store.atom.com.mm/mytmapi/v1/my',
  endpoints: {
    dashboard: 'dashboard?isFirstTime=1',
    pointDashboard: 'point-system/dashboard',
    balance: 'lightweight-balance',
    pointDetail: 'point-system/details'
  },
  pageSize: 10
};

export const useSoldSimInventory = () => {
  const { showAlert } = useContext(AlertContext);
  const [state, setState] = useState({
    loading: {
      isLoading: false,
      progress: { current: 0, total: 0, message: '' }
    },
    data: [],
    status: {
      isRefreshing: false
    }
  });

  const activeControllers = useRef(new Set());

  // State management helpers
  const updateState = useCallback((updates) => {
    setState((prev) => ({ ...prev, ...updates }));
  }, []);

  const updateLoadingState = useCallback(
    (isLoading, progress = { current: 0, total: 0, message: '' }) => {
      updateState({ loading: { isLoading, progress } });
    },
    [updateState]
  );

  const makeApiRequest = useCallback(async (endpoint, item, options = {}) => {
    const { method = 'get', data, controller, retryCount = 0 } = options;
    const maxRetries = 2; // Maximum number of retry attempts
    const headers = await getCommonHeaders(item.token);
  
    try {
      const response = await axios({
        method,
        url: `${API_CONFIG.baseUrl}/${endpoint}`,
        params: {
          msisdn: item.msisdn,
          userid: item.user_id,
          v: API_CONFIG.version
        },
        headers: headers,
        data,
        signal: controller?.signal,
        timeout: 150000 // 10 seconds timeout
      });
      return response.data;
    } catch (error) {
      if (axios.isCancel(error)) {
        return null;
      }
  
      console.error(`API Error (${endpoint}):`, error.message);
  
      // Handle 410 Gone status specifically
      if (error.response?.status === 410) {
        throw new Error('Resource no longer available (410 Gone)');
      }
  
      // Handle token expiration (401) with retry logic
      if (error.response?.status === 401 && retryCount < maxRetries) {
        try {
          // Refresh token and retry
          const refreshedItem = await refreshAccessToken(item);
          return makeApiRequest(endpoint, refreshedItem, { 
            ...options, 
            retryCount: retryCount + 1 
          });
        } catch (refreshError) {
          console.error('Token refresh failed:', refreshError);
          throw new Error('Authentication failed after refresh');
        }
      }
  
      // Handle network errors with retry
      if (!error.response && retryCount < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
        return makeApiRequest(endpoint, item, { 
          ...options, 
          retryCount: retryCount + 1 
        });
      }
  
      // Format error message for the UI
      const errorMessage = error.response?.data?.message || 
                         error.message || 
                         'An unknown error occurred';
  
      throw new Error(errorMessage);
    }
  }, []);;

  // Process single account data
  const processAccount = useCallback(
    async (account, options = {}) => {
      const { forceRefresh = false, controller } = options;

      try {
        const [dashboard, pointDashboard, balance, pointDetails] = await Promise.all([
          makeApiRequest(API_CONFIG.endpoints.dashboard, account, { controller }),
          makeApiRequest(API_CONFIG.endpoints.pointDashboard, account, { controller }),
          makeApiRequest(API_CONFIG.endpoints.balance, account, { controller }),
          makeApiRequest(API_CONFIG.endpoints.pointDetail, account, { controller })
        ]);

        const processedAccount = {
          ...account,
          mainBalance: balance?.data?.attribute?.mainBalance || {
            availableTotalBalance: 0,
            currency: 'Ks'
          },
          totalPoint: pointDashboard?.data?.attribute?.totalPoint || 0,
          startStatusLabel: dashboard?.data?.attribute?.startStatusLabel || '',
          loyaltyData: balance?.data?.attribute?.packsPieData?.data.packsList || null,
          lastUpdated: new Date().toISOString()
        };

        // Save to local storage
        await addToSoldInventory(processedAccount);
        await saveFirebaseSoldSim(processedAccount);
        return processedAccount;
      } catch (error) {
        if (!axios.isCancel(error)) {
          console.error(`Processing Error (${account.msisdn}):`, error.message);
          return {
            ...account,
            hasError: true,
            errorMessage: error.message,
            lastUpdated: new Date().toISOString()
          };
        }
        return null;
      }
    },
    [makeApiRequest]
  );

  // Fetch initial data
  const fetchData = useCallback(async () => {
    console.log('Fetching data...');
    const controller = new AbortController();
    activeControllers.current.add(controller);

    try {
      updateLoadingState(true, { message: 'Loading accounts...' });
      const firstPage = await getAllSoldSims(1, API_CONFIG.pageSize);

      if (!firstPage?.length) {
        updateState({ data: [] });
        return;
      }

      const processedAccounts = await Promise.all(
        firstPage.map((account) =>
          processAccount(account, { controller })
        )
      );

      updateState({ data: processedAccounts });
    } catch (error) {
      console.error('Initial Load Error:', error);
    } finally {
      activeControllers.current.delete(controller);
      updateLoadingState(false);
    }
  }, [processAccount, updateLoadingState, updateState]);

  // Refresh data
  const refreshData = useCallback(async () => {
    console.log('Refreshing data...');
    if (state.status.isRefreshing) return;

    const controller = new AbortController();
    activeControllers.current.add(controller);

    try {
      updateState({
        status: { isRefreshing: true },
        loading: { isLoading: true, progress: { current: 0, total: 0, message: 'Refreshing data...' } }
      });

      const currentData = await getAllSoldSims();
      if (!currentData?.length) {
        updateState({ data: [], status: { isRefreshing: false } });
        return;
      }

      const processedAccounts = await Promise.all(
        currentData.map((account) =>
          processAccount(account, { controller })
        )
      );

      updateState({
        data: processedAccounts,
        status: { isRefreshing: false }
      });
    } catch (error) {
      console.error('Refresh Error:', error);
    } finally {
      activeControllers.current.delete(controller);
      updateLoadingState(false);
    }
  }, [processAccount, state.status.isRefreshing, updateLoadingState, updateState]);

  return {
    loadingState: state.loading,
    data: state.data,
    fetchData,
    refreshData
  };
};