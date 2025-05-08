import { useLayoutEffect } from 'react';

const useHeader = (navigation, title) => {
  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: title,
      headerTitleAlign: 'center',
      headerStyle: { backgroundColor: '#0a34cc' },
      headerTintColor: 'white',
      headerTitleStyle: { fontWeight: 'bold', fontSize: 20 },
    });
  }, [navigation, title]);
};

export default useHeader;
