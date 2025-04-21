import { createSlice, PayloadAction } from '@reduxjs/toolkit';

// Define the auth state interface
interface AuthState {
  isLoggedIn: boolean;
  userData: {
    id?: string;
    email?: string;
    name?: string;
    picture?: string;
    [key: string]: any;
  } | null;
  token: string | null;
  loading: boolean;
  error: string | null;
}

// Define the initial state
const initialState: AuthState = {
  isLoggedIn: false,
  userData: null,
  token: null,
  loading: false,
  error: null
};

// Create the auth slice
const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    // Action to set login state with user data
    setLogin: (state, action: PayloadAction<{ isLoggedIn: boolean; userData: any }>) => {
      state.isLoggedIn = action.payload.isLoggedIn;
      state.userData = action.payload.userData;
      state.error = null;
    },
    
    // Action to set token
    setToken: (state, action: PayloadAction<string>) => {
      state.token = action.payload;
    },
    
    // Action to set loading state
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    
    // Action to set error message
    setError: (state, action: PayloadAction<string>) => {
      state.error = action.payload;
    },
    
    // Action to clear error
    clearError: (state) => {
      state.error = null;
    },
    
    // Action to set logout state
    setLogout: (state) => {
      state.isLoggedIn = false;
      state.userData = null;
      state.token = null;
      state.error = null;
    }
  }
});

// Export actions
export const { 
  setLogin, 
  setToken, 
  setLoading, 
  setError, 
  clearError, 
  setLogout 
} = authSlice.actions;

// Export reducer
export default authSlice.reducer; 