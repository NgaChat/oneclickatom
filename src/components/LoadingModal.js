import React from 'react';
import { View, Text, Modal, ActivityIndicator, StyleSheet } from 'react-native';

const LoadingModal = ({ visible, progress }) => {
  let total = 0;
  if(progress && progress.total){
    total = progress.total;
  }
  return (
    <Modal transparent visible={visible}>
      <View style={styles.modalBackground}>
        <View style={styles.content}>
          <ActivityIndicator size="large" color="#0a34cc" />
          <Text style={styles.text}>{progress?progress.message:""}</Text>
          {total > 0 && (
            <Text style={styles.progressText}>
              {progress.current}/{total}
            </Text>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalBackground: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  content: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 25,
    alignItems: 'center',
    marginHorizontal: 40,
  },
  text: {
    marginTop: 15,
    fontSize: 16,
    fontWeight: '600',
  },
  progressText: {
    marginTop: 5,
    color: '#666',
  },
});

export default LoadingModal;