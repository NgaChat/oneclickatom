import { useCallback } from 'react';
import axios from 'axios';
import { Alert } from 'react-native';
import { refreshAccessToken, getCommonHeaders } from '../services/service';

export const useDashboardActions = (data, updateUserData, setData) => {
  const handleDelete = useCallback((userId) => {
    Alert.alert(
      'Confirm Delete',
      'Are you sure you want to delete this account?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          onPress: () => {
            const updatedData = data.filter(item => item.user_id !== userId);
            updateUserData(updatedData);
            setData(updatedData); // update local state for immediate UI update
          },
        },
      ]
    );
  }, [data, updateUserData, setData]);

  const claimAllPoints = useCallback(async () => {
    if (!data.length) return;
    
    try {
      const results = await Promise.all(
        data.map(async (item) => {
          const headers = await getCommonHeaders(item.token);
          const params = { msisdn: item.msisdn, userid: item.user_id };
          await axios.post(
            'https://store.atom.com.mm/mytmapi/v1/my/point-system/claim',
            { id: item.points?.id },
            { params, headers }
          );
          return { ...item, label: 'Claimed' };
        })
      );
      updateUserData(results);
      setData(results); // also update local state here
      Alert.alert('Success', 'All points claimed!');
    } catch (error) {
      Alert.alert('Error', 'Failed to claim points');
    }
  }, [data, getCommonHeaders, updateUserData, setData]);

  return { handleDelete, claimAllPoints };
};
