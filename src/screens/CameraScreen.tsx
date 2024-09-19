import React, { useState } from 'react';
import { View, Button, Text, Image, Alert, StyleSheet } from 'react-native';
import { launchCamera, Asset, ImagePickerResponse } from 'react-native-image-picker';

const CameraScreen = () => {
  const [angle, setAngle] = useState(0); // To track which angle we're capturing
  const [imageUris, setImageUris] = useState<{ front: string | null, left: string | null, right: string | null, back: string | null }>({
    front: null,
    left: null,
    right: null,
    back: null,
  });

  const angleInstructions = [
    { key: 'front', text: 'Take a picture from the front' },
    { key: 'left', text: 'Take a picture from the left side' },
    { key: 'right', text: 'Take a picture from the right side' },
    { key: 'back', text: 'Take a picture from the back' }
  ];

  const takePicture = () => {
    if (angle < angleInstructions.length) {
      const currentAngle = angleInstructions[angle].key;

      launchCamera({ mediaType: 'photo' }, (response: ImagePickerResponse) => {
        if (response.didCancel) {
          Alert.alert('Action cancelled', 'No picture taken');
        } else if (response.errorMessage) {
          Alert.alert('Error', response.errorMessage);
        } else if (response.assets && response.assets.length > 0) {
          const uri = response.assets[0].uri;
          setImageUris((prevUris) => ({
            ...prevUris,
            [currentAngle]: uri
          }));
          setAngle(angle + 1); // Move to the next angle
        }
      });
    }
  };

  const renderPreview = (uri: string | null) => {
    return uri ? (
      <Image source={{ uri }} style={styles.previewImage} />
    ) : (
      <Text>No image</Text>
    );
  };

  return (
    <View style={styles.container}>
      {angle < angleInstructions.length ? (
        <View>
          <Text style={styles.instructionText}>
            {angleInstructions[angle].text}
          </Text>
          <Button title="Take Picture" onPress={takePicture} />
        </View>
      ) : (
        <Text style={styles.doneText}>All pictures taken! Ready for 3D processing.</Text>
      )}

      <View style={styles.previewContainer}>
        <Text>Front:</Text>
        {renderPreview(imageUris.front)}
        <Text>Left:</Text>
        {renderPreview(imageUris.left)}
        <Text>Right:</Text>
        {renderPreview(imageUris.right)}
        <Text>Back:</Text>
        {renderPreview(imageUris.back)}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  instructionText: {
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 20,
  },
  doneText: {
    fontSize: 20,
    textAlign: 'center',
    marginBottom: 20,
    color: 'green',
  },
  previewContainer: {
    marginTop: 20,
  },
  previewImage: {
    width: 100,
    height: 100,
    marginVertical: 10,
  },
});

export default CameraScreen;