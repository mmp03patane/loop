import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { NavigationContainer, useNavigation } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import HeaderSearchBar from './src/components/HeaderSearchBar';
import FeedScreen from './src/screens/FeedScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import FollowingScreen from './src/screens/FollowingScreen';
import NotificationsScreen from './src/screens/NotificationsScreen';
import CreateSeriesScreen from './src/screens/CreateSeriesScreen';
import SeriesDetailScreen from './src/screens/SeriesDetailScreen';
import VideoDetailScreen from './src/screens/VideoDetailScreen';
import SearchScreen from './src/screens/SearchScreen';
import EditVideoScreen from './src/screens/EditVideoScreen';
import UploadScreen from './src/screens/UploadScreen';
import AddToSeriesScreen from './src/screens/AddToSeriesScreen';

export type MainTabParamList = {
  Home: undefined;
  Following: undefined;
  CreateVideo: undefined;
  Notifications: undefined;
  Profile: undefined;
};

export type RootStackParamList = {
  MainTabs: undefined;
  CreateSeries: undefined;
  Upload: { seriesId?: string };
  SeriesDetail: { seriesId: string; title: string };
  VideoDetail: { url: string; caption: string; userName: string; id?: string; fromProfile?: boolean };
  Search: undefined;
  EditVideo: { videoId: string };
  AddToSeries: { seriesId: string; title: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

function EmptyScreen() {
  return <View />;
}

function CreateOption({
  icon,
  label,
  onPress,
  targetScreen,
}: {
  icon: any;
  label: string;
  onPress: () => void;
  targetScreen: 'Upload' | 'CreateSeries';
}) {
  const navigation = useNavigation<any>();
  return (
    <TouchableOpacity
      style={modalStyles.option}
      onPress={() => {
        onPress();
        if (targetScreen === 'Upload') {
          navigation.navigate('Upload', {});
        } else {
          navigation.navigate('CreateSeries');
        }
      }}
    >
      <Ionicons name={icon} size={26} color="#a78bfa" />
      <Text style={modalStyles.optionText}>{label}</Text>
    </TouchableOpacity>
  );
}

function MainTabs() {
  const insets = useSafeAreaInsets();
  const [createModalVisible, setCreateModalVisible] = useState(false);

  return (
    <>
      <Tab.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: '#0f0f1a' },
          headerTintColor: '#a78bfa',
          tabBarStyle: {
            backgroundColor: '#0f0f1a',
            borderTopColor: '#1a1a2e',
            height: 60 + insets.bottom,
            paddingBottom: insets.bottom,
            paddingTop: 6,
          },
          tabBarActiveTintColor: '#a78bfa',
          tabBarInactiveTintColor: '#666',
          tabBarShowLabel: false,
        }}
      >
        <Tab.Screen
          name="Home"
          component={FeedScreen}
          options={{
            headerTitle: () => <Text style={styles.logo}>Loop</Text>,
            headerRight: () => <HeaderSearchBar />,
            tabBarIcon: ({ focused, color, size }) => (
              <Ionicons name={focused ? 'home' : 'home-outline'} size={size} color={color} />
            ),
          }}
        />

        <Tab.Screen
          name="Following"
          component={FollowingScreen}
          options={{
            title: 'Following',
            headerRight: () => <HeaderSearchBar />,
            tabBarIcon: ({ focused, color, size }) => (
              <Ionicons name={focused ? 'people' : 'people-outline'} size={size} color={color} />
            ),
          }}
        />

        <Tab.Screen
          name="CreateVideo"
          component={EmptyScreen}
          options={{
            tabBarIcon: () => (
              <View style={styles.plusButton}>
                <Ionicons name="add" size={28} color="white" />
              </View>
            ),
          }}
          listeners={() => ({
            tabPress: (e) => {
              e.preventDefault();
              setCreateModalVisible(true);
            },
          })}
        />

        <Tab.Screen
          name="Notifications"
          component={NotificationsScreen}
          options={{
            title: 'Notifications',
            headerRight: () => <HeaderSearchBar />,
            tabBarIcon: ({ focused, color, size }) => (
              <Ionicons
                name={focused ? 'notifications' : 'notifications-outline'}
                size={size}
                color={color}
              />
            ),
          }}
        />

        <Tab.Screen
          name="Profile"
          component={ProfileScreen}
          options={{
            title: 'Profile',
            headerRight: () => <HeaderSearchBar />,
            tabBarIcon: ({ focused, color, size }) => (
              <Ionicons
                name={focused ? 'person-circle' : 'person-circle-outline'}
                size={size}
                color={color}
              />
            ),
          }}
        />
      </Tab.Navigator>

      <Modal visible={createModalVisible} transparent animationType="slide">
        <TouchableOpacity
          style={modalStyles.backdrop}
          activeOpacity={1}
          onPress={() => setCreateModalVisible(false)}
        >
          <View style={modalStyles.sheet}>
            <Text style={modalStyles.title}>Create</Text>

            <CreateOption
              icon="cloud-upload"
              label="Upload Video"
              onPress={() => setCreateModalVisible(false)}
              targetScreen="Upload"
            />
            <CreateOption
              icon="albums"
              label="New Series"
              onPress={() => setCreateModalVisible(false)}
              targetScreen="CreateSeries"
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <StatusBar style="light" />
        <Stack.Navigator
          screenOptions={{
            headerStyle: { backgroundColor: '#0f0f1a' },
            headerTintColor: '#a78bfa',
            headerTitleStyle: { fontWeight: '600' },
            contentStyle: { backgroundColor: '#0f0f1a' },
          }}
        >
          <Stack.Screen name="MainTabs" component={MainTabs} options={{ headerShown: false }} />
          <Stack.Screen
            name="CreateSeries"
            component={CreateSeriesScreen}
            options={{ title: 'New Series' }}
          />
          <Stack.Screen
            name="Upload"
            component={UploadScreen}
            options={{ headerShown: false, presentation: 'fullScreenModal' }}
          />
          <Stack.Screen name="SeriesDetail" component={SeriesDetailScreen} />
          <Stack.Screen
            name="VideoDetail"
            component={VideoDetailScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="Search"
            component={SearchScreen}
            options={{ title: 'Search' }}
          />
          <Stack.Screen
  name="EditVideo"
  component={EditVideoScreen}
  options={{ title: 'Edit Video' }}
/>
          <Stack.Screen
            name="AddToSeries"
            component={AddToSeriesScreen}
            options={{ title: 'Add Videos' }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  logo: { color: '#a78bfa', fontSize: 22, fontWeight: '700' },
  plusButton: {
    width: 44,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#7c3aed',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

const modalStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  sheet: {
    backgroundColor: '#1a1a2e',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
  },
  title: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#0f0f1a',
  },
  optionText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
});