import React from 'react';
import { createIconSetFromFontello } from 'react-native-vector-icons';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import AntDesign from 'react-native-vector-icons/AntDesign';
import Entypo from 'react-native-vector-icons/Entypo';
import EvilIcons from 'react-native-vector-icons/EvilIcons';
import Feather from 'react-native-vector-icons/Feather';
import Fontisto from 'react-native-vector-icons/Fontisto';
import Foundation from 'react-native-vector-icons/Foundation';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import Octicons from 'react-native-vector-icons/Octicons';
import Zocial from 'react-native-vector-icons/Zocial';
import SimpleLineIcons from 'react-native-vector-icons/SimpleLineIcons';
import Ionicons from 'react-native-vector-icons/Ionicons';
import FontAwesome6 from 'react-native-vector-icons/FontAwesome6';

// Add more icon sets as needed
const icons = {
  FontAwesome,
  MaterialIcons,
  Ionicons,
  AntDesign,
  Entypo,
  EvilIcons,
  Feather,
  Fontisto,
  Foundation,
  MaterialCommunityIcons,
  Octicons,
  Zocial,
  SimpleLineIcons,
  FontAwesome6
};

const Icon = ({ name, size, color, type }) => {
  const IconComponent = icons[type] || FontAwesome;
  return <IconComponent name={name} size={size} color={color} />;
};

export default Icon;
