import { useState, useCallback, useRef, useEffect,useContext } from 'react';
import { Alert } from 'react-native';
import {
  getLocalSimData,
  refreshAccessToken,
  getCommonHeaders,
  saveLocalSimData,
  getAllLocalSimData,
  deleteSimData as deleteSimDataFromDB,
  deleteFirebaseSimItem,
  saveFirebaseSimData,
  getFirebaseSimData
} from '../services/service';
import axios from 'axios';
import { AlertContext } from '../utils/alertUtils';

// API Configuration
const API_CONFIG = {
  version: '4.11',
  baseUrl: 'https://store.atom.com.mm/mytmapi/v1/my',
  endpoints: {
    dashboard: 'dashboard?isFirstTime=1',
    pointDashboard: 'point-system/dashboard',
    balance: 'lightweight-balance',
    claimList: 'point-system/claim-list',
    claim: 'point-system/claim'
  },
  pageSize: 10
};

export const useDashboardData = () => {
  const { showAlert } = useContext(AlertContext);
  const dataRef = useRef([]);
  const [state, setState] = useState({
    loading: {
      isLoading: false,
      progress: { current: 0, total: 0, message: '' }
    },
    pagination: {
      currentPage: 1,
      hasMore: true
    },
    data: [],
    status: {
      isRefreshing: false,
      isLoadingMore: false,
      isClaiming: false,
      claimProgress: { current: 0, total: 0 }
    }
  });

  const activeControllers = useRef(new Set());

  // Sync `data` state with `dataRef`
  useEffect(() => {
    dataRef.current = state.data;
  }, [state.data]);

  // Derived state
  const { loading, pagination, data, status } = state;
  const { currentPage, hasMore } = pagination;
  const { isRefreshing, isLoadingMore, isClaiming, claimProgress } = status;

  // Clean up pending requests on unmount
  useEffect(() => {
    return () => {
      activeControllers.current.forEach(controller => {
        controller.abort();
      });
      activeControllers.current.clear();
    };
  }, []);

  // State management helpers
  const updateState = useCallback((updates) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  const updateLoadingState = useCallback((isLoading, progress = { current: 0, total: 0, message: '' }) => {
    updateState({ loading: { isLoading, progress } });
  }, [updateState]);

  // API request handler
  const makeApiRequest = useCallback(async (endpoint, item, options = {}) => {
    const { method = 'get', data, controller } = options;
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
        headers,
        data,
        signal: controller?.signal
      });
      return response.data;
    } catch (error) {
      if (!axios.isCancel(error)) {
        console.error(`API Error (${endpoint}):`, error.message);
        throw error;
      }
      return null;
    }
  }, []);

  // Process single account data
  const processAccount = useCallback(async (account, options = {}) => {
    const { forceRefresh = false, controller, progressCallback } = options;

    try {
      // Refresh token if needed
      const updatedAccount = await refreshAccessToken(account, forceRefresh);
      const currentToken = updatedAccount.token;

      // Fetch all account data in parallel
      const [dashboard, pointDashboard, balance, points] = await Promise.all([
        makeApiRequest(API_CONFIG.endpoints.dashboard, { ...account, token: currentToken }, { controller }),
        makeApiRequest(API_CONFIG.endpoints.pointDashboard, { ...account, token: currentToken }, { controller }),
        makeApiRequest(API_CONFIG.endpoints.balance, { ...account, token: currentToken }, { controller }),
        makeApiRequest(API_CONFIG.endpoints.claimList, { ...account, token: currentToken }, { controller })
      ]);


      
      // Prepare updated account data
      const processedAccount = {
        ...updatedAccount,
        mainBalance: balance?.data?.attribute?.mainBalance || {
          availableTotalBalance: 0,
          currency: 'Ks'
        },
        totalPoint: pointDashboard?.data?.attribute?.totalPoint || 0,
        startStatusLabel: dashboard?.data?.attribute?.startStatusLabel || '',
        points: points?.data?.attribute?.[0] || null,
        label: points?.data?.attribute?.[0]?.label || '',
        lastUpdated: new Date().toISOString()
      };

      // Save to local storage
      await saveLocalSimData(processedAccount);
      console.log('Account data saved to SQLite:', processedAccount.msisdn);
      await saveFirebaseSimData(processedAccount)
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
    } finally {
      progressCallback?.();
      
    }
  }, [makeApiRequest]);

  // Process multiple accounts with progress tracking
  const processAccounts = useCallback(async (accounts, options = {}) => {
    const { forceRefresh = false, controller } = options;
    const results = [];
    let processedCount = 0;

    const progressCallback = () => {
      processedCount++;
      updateLoadingState(true, {
        current: processedCount,
        total: accounts.length,
        message: `Processing ${processedCount}/${accounts.length}`
      });
    };

    // Process accounts sequentially for better progress tracking
    for (const account of accounts) {
      const result = await processAccount(account, {
        forceRefresh,
        controller,
        progressCallback
      });
      if (result) results.push(result);
    }

    return results;
  }, [processAccount, updateLoadingState]);

  // Fetch initial data
  const fetchData = useCallback(async (forceRefresh = false) => {
    const controller = new AbortController();
    activeControllers.current.add(controller);

    try {
      updateLoadingState(true, { message: 'Loading accounts...' });
      updateState({
        pagination: { currentPage: 1, hasMore: true },
        data: []
      });

      const firstPage = await getLocalSimData(1, API_CONFIG.pageSize);
      if (!firstPage?.length) {
        updateState({ data: [] });
        return;
      }

      const processedAccounts = await processAccounts(firstPage, {
        forceRefresh,
        controller
      });

      updateState({
        data: processedAccounts,
        pagination: { hasMore: firstPage.length >= API_CONFIG.pageSize }
      });

    } catch (error) {
      console.error('Initial Load Error:', error);
    } finally {
      activeControllers.current.delete(controller);
      updateLoadingState(false);
    }
  }, [processAccounts, updateState, updateLoadingState]);

  // Load more data
  const loadMore = useCallback(async () => {
    if (!hasMore || loading.isLoading || isLoadingMore) return;
  
    const controller = new AbortController();
    activeControllers.current.add(controller);
  
    try {
      const nextPage = currentPage + 1;
      console.log(`Loading more data for Page: ${nextPage}`);
  
      const newPage = await getLocalSimData(nextPage, API_CONFIG.pageSize);
  
      if (!newPage?.length) {
        console.log('No more data to load.');
        updateState(prev => ({
          ...prev,
          pagination: { ...prev.pagination, hasMore: false }
        }));
        return;
      }
  
      const processedAccounts = await processAccounts(newPage, { forceRefresh: false, controller });
  
      updateState(prev => ({
        data: [...prev.data, ...processedAccounts],
        pagination: {
          currentPage: nextPage,
          hasMore: newPage.length >= API_CONFIG.pageSize
        }
      }));
    } catch (error) {
      console.error('Load More Error:', error);
    } finally {
      activeControllers.current.delete(controller);
      updateState({ status: { ...status, isLoadingMore: false } });
      updateLoadingState(false);
    }
  }, [currentPage, hasMore, loading.isLoading, isLoadingMore, pagination, processAccounts, status, updateState, updateLoadingState]);
  // Refresh data
  const refreshData = useCallback(async () => {
    console.log('Refresh started'); // Debug log
    if (isRefreshing) {
      console.log('Already refreshing, skipping');
      return;
    }
  
    const controller = new AbortController();
    activeControllers.current.add(controller);
  
    try {
      // 1. စတင်ခြင်း - Loading state ကို သေချာစွာ set လုပ်ပါ
      console.log('Setting initial loading state');
      setState(prev => ({
        ...prev,
        status: {
          ...prev.status,
          isRefreshing: true,
          isLoadingMore: false
        },
        loading: {
          ...prev.loading,
          isLoading: true,
          progress: {
            current: 0,
            total: 0,
            message: 'Refreshing data...'
          }
        }
      }));
  
      // 2. Data ရယူခြင်း
      console.log('Fetching local data');
      const currentData = await getAllLocalSimData();
      
      if (!currentData?.length) {
        console.log('No data found, ending refresh');
        setState(prev => ({
          ...prev,
          status: { ...prev.status, isRefreshing: false },
          loading: { ...prev.loading, isLoading: false }
        }));
        return;
      }
  
      console.log(`Processing ${currentData.length} accounts`);
  
      // 3. Account တစ်ခုချင်းစီကို Process လုပ်ခြင်း
      const results = [];
      for (let i = 0; i < currentData.length; i++) {
        const account = currentData[i];
        
        // Progress update
        console.log(`Processing account ${i+1}/${currentData.length}`);
        setState(prev => ({
          ...prev,
          loading: {
            ...prev.loading,
            progress: {
              current: i + 1,
              total: currentData.length,
              message: `Updating ${account.msisdn}`
            }
          }
        }));
  
        try {
          const processedAccount = await processAccount(account, {
            forceRefresh: true,
            controller
          });
          if (processedAccount) {
            results.push(processedAccount);
          }
        } catch (error) {
          console.error(`Error processing ${account.msisdn}:`, error);
          results.push({
            ...account,
            hasError: true,
            errorMessage: error.message
          });
        }
      }
  
      // 4. ပြီးဆုံးခြင်း - Loading state ကို ပိတ်ပါ
      console.log('Refresh completed, updating state');
      setState(prev => ({
        ...prev,
        data: results,
        status: {
          ...prev.status,
          isRefreshing: false,
          lastUpdated: new Date().toISOString()
        },
        loading: {
          ...prev.loading,
          isLoading: false,
          progress: {
            current: 0,
            total: 0,
            message: 'Refresh completed'
          }
        }
      }));
  
    } catch (error) {
      console.error('Refresh failed:', error);
      setState(prev => ({
        ...prev,
        status: { ...prev.status, isRefreshing: false },
        loading: {
          ...prev.loading,
          isLoading: false,
          progress: {
            current: 0,
            total: 0,
            message: `Error: ${error.message}`
          }
        }
      }));
    } finally {
      console.log('Cleaning up refresh controller');
      activeControllers.current.delete(controller);
    }
  }, [isRefreshing, processAccount]);

  // Claim points for eligible accounts
  const claimAllPoints = useCallback(async () => {
    try {
      // Set loading state to true
      updateLoadingState(true, { message: 'Claiming points...' });

      const allAccounts = await getAllLocalSimData();
      const claimableAccounts = allAccounts.filter(account =>
        account.points?.enable === true && account.points?.id
      );

      if (!claimableAccounts.length) {
        showAlert({
          title: 'Info',
          message: 'No accounts with claimable points',
          type: 'info'
        }); 
        return;
      }

      updateState(prev => {
        console.log('Setting isClaiming to true');
        return {
          status: {
            ...prev.status,
            isClaiming: true,
            claimProgress: {
              current: 0,
              total: claimableAccounts.length
            }
          }
        };
      });

      // Process claims sequentially
      for (const [index, account] of claimableAccounts.entries()) {
        try {
          // Update progress
          updateState(prev => ({
            status: {
              ...prev.status,
              claimProgress: {
                ...prev.status.claimProgress,
                current: index + 1
              }
            }
          }));

          // Claim points
          await makeApiRequest(
            API_CONFIG.endpoints.claim,
            account,
            {
              method: 'post',
              data: { id: account.points.id }
            }
          );

          // Get updated account data
          const updatedAccount = await processAccount(account, { forceRefresh: false });

          if (updatedAccount) {
            // Update state only for this account
            setState(prev => ({
              ...prev,
              data: prev.data.map(a =>
                a.user_id === account.user_id ? updatedAccount : a
              )
            }));
          }

        } catch (error) {
          console.error(`Claim Error (${account.msisdn}):`, error);

          // Mark account as failed
          setState(prev => ({
            ...prev,
            data: prev.data.map(a =>
              a.user_id === account.user_id
                ? {
                  ...a,
                  hasError: true,
                  errorMessage: error.message,
                  points: { ...a.points, enable: false },
                  lastUpdated: new Date().toISOString()
                }
                : a
            )
          }));
        }
      }

      showAlert({
        title: 'Complete',
        message: `Processed ${claimableAccounts.length} accounts`,
        type: 'success'
      }); // Use showAlert for success message

    } catch (error) {
      console.error('Claim Process Error:', error);
      showAlert({
        title: 'Error',
        message: 'Failed to complete claims',
        type: 'error'
      }); 
    } finally {
      // Reset loading state and isClaiming
      updateLoadingState(false);
      updateState({ status: { ...status, isClaiming: false } });
    }
  }, [makeApiRequest, processAccount, status, updateState, updateLoadingState]);;

  // Delete account
  const deleteSimData = useCallback(async (userId) => {
    try {
      // Delete the account from SQLite
      await deleteSimDataFromDB(userId);
      await deleteFirebaseSimItem(userId);

      // Update the local state to remove the deleted account
      setState((prev) => ({
        ...prev,
        data: prev.data.filter((account) => account.user_id !== userId), // Remove the deleted account
      }));

      console.log(`Account with user_id ${userId} deleted successfully from firebase.`);
    } catch (error) {
      console.error(`Deletion Error (${userId}):`, error);
      throw error;
    }
  }, []);

  // Fetch single item
  const fetchSingleItem = useCallback(async (msisdn) => {
    const controller = new AbortController();
    activeControllers.current.add(controller);

    try {
      console.log('Searching for msisdn:', msisdn);


      // Find the account by msisdn
      const account = dataRef.current.find((item) => item.msisdn === msisdn);
      console.log('Found account:', account);

      if (!account) {
        Alert.alert('Error', `No account found with msisdn: ${msisdn}`);
        return;
      }

      // Fetch updated data for the account
      const updatedAccount = await processAccount(account, {
        forceRefresh: false,
        controller,
      });

      if (updatedAccount) {
        // Update the state with the updated account
        setState((prev) => ({
          ...prev,
          data: prev.data.map((item) =>
            item.msisdn === msisdn ? updatedAccount : item
          ),
        }));

        console.log(`Account with msisdn ${msisdn} updated successfully.`);
      }
    } catch (error) {
      console.error(`Fetch Single Item Error (${msisdn}):`, error.message);
      Alert.alert('Error', `Failed to fetch data for msisdn: ${msisdn}`);
    } finally {
      activeControllers.current.delete(controller);
    }
  }, [processAccount]);

  // Fetch all data
  const fetchAllData = useCallback(async () => {
    const controller = new AbortController();
    activeControllers.current.add(controller);

    try {
      updateLoadingState(true, { message: 'Loading all accounts...' });

      const allAccounts = await getAllLocalSimData();
      if (!allAccounts?.length) {
        updateState({ data: [] });
        return;
      }

      const processedAccounts = await processAccounts(allAccounts, {forceRefresh:false, controller });
      updateState({ data: processedAccounts });

    } catch (error) {
      console.error('Full Load Error:', error);
    } finally {
      activeControllers.current.delete(controller);
      updateLoadingState(false);
    }
  }, [processAccounts, updateState, updateLoadingState]);

  const syncFirebaseToLocal = useCallback(async () => {
    try {
      // Fetch data from SQLite
      const localData = await getAllLocalSimData();
      const localDataIds = localData.map((item) => item.user_id); // Extract user IDs from local data

      // Fetch data from Firebase
      const firebaseData = await getFirebaseSimData();
      if (!firebaseData) {
        console.log('No data found in Firebase to sync.');
        return;
      }

      // Ensure Firebase data is an array
      const firebaseDataArray = Array.isArray(firebaseData)
        ? firebaseData
        : Object.values(firebaseData);

      // Loop through Firebase data and save missing items to SQLite
      for (const item of firebaseDataArray) {
        if (!localDataIds.includes(item.user_id)) {
          console.log(`Saving missing item to SQLite: user_id = ${item.user_id}`);
          await saveLocalSimData(item); // Save missing item to SQLite
        }
      }

      console.log('Sync completed successfully.');
    } catch (error) {
      console.error('Error syncing Firebase data to SQLite:', error);
    }
  }, []);

  return {
    loadingState: loading,
    data,
    fetchData,
    loadMore,
    refreshData,
    fetchAllData,
    fetchSingleItem,
    deleteSimData,
    claimAllPoints,
    hasMore,
    isRefreshing,
    isLoadingMore,
    isClaiming,
    claimProgress,
    fetchSingleItem,
    syncFirebaseToLocal
  };
};