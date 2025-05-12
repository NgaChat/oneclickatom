import { useState, useCallback, useRef, useEffect, useContext } from 'react';
import { Alert } from 'react-native';
import pLimit from 'p-limit';
import {
  refreshAccessToken,
  getCommonHeaders,
  deleteSimData as deleteSimDataFromDB,
  getAllAdminData,

  updateToUser,
  saveFirebaseAdminData
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

export const useCreateUserData = () => {
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
      await updateToUser(processedAccount);
      console.log('Account data saved to Admin Firebase:', processedAccount.msisdn);

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
  const fetchData = useCallback(async (data, forceRefresh = false) => {
    const controller = new AbortController();
    activeControllers.current.add(controller);


    try {
      updateLoadingState(true, { message: 'Loading accounts...' });
      updateState({
        pagination: { currentPage: 1, hasMore: true },
        data: []
      });

      const fData = data.data


      const processedAccounts = await processAccounts(fData, {
        forceRefresh,
        controller
      });

      updateState({
        data: processedAccounts,
        pagination: { hasMore: fData.length >= API_CONFIG.pageSize }
      });

    } catch (error) {
      console.error('Initial Load Error:', error);
    } finally {
      activeControllers.current.delete(controller);
      updateLoadingState(false);
    }
  }, [processAccounts, updateState, updateLoadingState]);


  // Refresh data
  const refreshData = useCallback(async (data) => {
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
      const currentData = data.data
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
        console.log(`Processing account ${i + 1}/${currentData.length}`);
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



const claimAllPoints = useCallback(async (data) => {
  const controller = new AbortController();
  activeControllers.current.add(controller);

  const CONCURRENCY_LIMIT = 20; // ✅ Customize this based on performance testing
  const limit = pLimit(CONCURRENCY_LIMIT);

  try {
    // 1. Initial State
    setState(prev => ({
      ...prev,
      loading: {
        isLoading: true,
        progress: { 
          current: 0, 
          total: 0, 
          message: 'Preparing to claim points...' 
        }
      },
      status: {
        ...prev.status,
        isClaiming: true,
        claimProgress: { current: 0, total: 0 }
      }
    }));

    // 2. Filter accounts that can be claimed
    const claimableAccounts = data.data.filter(acc => acc.points?.enable && acc.points?.id);

    if (claimableAccounts.length === 0) {
      showAlert({
        title: 'No Claimable Points',
        message: 'There are no points available to claim at this time.',
        type: 'info'
      });
      return;
    }

    const totalAccounts = claimableAccounts.length;
    let successCount = 0;
    const failedClaims = [];
    let currentProgress = 0;

    // 3. Set total
    setState(prev => ({
      ...prev,
      loading: {
        ...prev.loading,
        progress: {
          current: 0,
          total: totalAccounts,
          message: `Starting to claim ${totalAccounts} points...`
        }
      },
      status: {
        ...prev.status,
        claimProgress: {
          current: 0,
          total: totalAccounts
        }
      }
    }));

    // 4. Use p-limit to process in parallel batches
    const claimTasks = claimableAccounts.map(account =>
      limit(async () => {
        try {
          await makeApiRequest(API_CONFIG.endpoints.claim, account, {
            method: 'post',
            data: { id: account.points.id },
            controller
          });

          successCount++;
        } catch (error) {
          console.error(`Claim failed for ${account.msisdn}:`, error);
          failedClaims.push({
            msisdn: account.msisdn,
            error: error.message
          });
        } finally {
          currentProgress++;
          setState(prev => ({
            ...prev,
            loading: {
              ...prev.loading,
              progress: {
                current: currentProgress,
                total: totalAccounts,
                message: `Claiming ${currentProgress} / ${totalAccounts}...`
              }
            },
            status: {
              ...prev.status,
              claimProgress: {
                current: currentProgress,
                total: totalAccounts
              }
            }
          }));
        }
      })
    );

    await Promise.all(claimTasks);

    // 5. Show results
    if (successCount === totalAccounts) {
      showAlert({
        title: 'Success',
        message: `All ${successCount} points were claimed successfully!`,
        type: 'success'
      });
    } else if (successCount > 0) {
      showAlert({
        title: 'Partial Success',
        message: `Successfully claimed ${successCount} out of ${totalAccounts} points.`,
        type: 'info'
      });

      if (failedClaims.length > 0) {
        setTimeout(() => {
          showAlert({
            title: 'Some Claims Failed',
            message: `${failedClaims.length} accounts had errors during claiming.`,
            type: 'error'
          });
        }, 500);
      }
    } else {
      showAlert({
        title: 'Claiming Failed',
        message: 'Failed to claim points for all accounts.',
        type: 'error'
      });
    }

  } catch (error) {
    console.error('Claiming process failed:', error);
    showAlert({
      title: 'Error',
      message: 'An unexpected error occurred during the claiming process.',
      type: 'error'
    });
  } finally {
    activeControllers.current.delete(controller);
    setState(prev => ({
      ...prev,
      loading: { 
        ...prev.loading, 
        isLoading: false,
        progress: { current: 0, total: 0, message: '' }
      },
      status: {
        ...prev.status,
        isClaiming: false
      }
    }));
  }
}, [makeApiRequest, showAlert]);



  // Delete account
  const deleteSimData = useCallback(async (userId) => {
    try {

      // firebase admin/data ထဲက ဖျက်ရန်
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





  return {
    loadingState: loading,
    data,
    fetchData,
    refreshData,
    deleteSimData,
    claimAllPoints,
    isClaiming,
    claimProgress,
    isRefreshing

  };
};