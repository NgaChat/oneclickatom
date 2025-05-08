import { useCallback } from 'react';
import axios from 'axios';
import { Alert } from 'react-native';
import { getUser, getCommonHeaders, deleteSimItem } from '../services/service';
import { database } from '../config/firebase';
import { ref, set, get } from 'firebase/database';

export const useDashboardActions = (data, updateUserData, setData) => {
  const handleDelete = useCallback((id) => {
    Alert.alert(
      'Confirm Delete',
      'Are you sure you want to delete this account?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          onPress: async () => {



            const result = await deleteSimItem(id);
  
            if (result.success) {
              console.log('Deleted successfully. New data:', result.newData);
              // Update your UI with the new data
            } else {
              console.error('Delete failed:', result.message);
              // Show error to user
            }
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
