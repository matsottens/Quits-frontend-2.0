/**
 * This file is a compatibility layer to forward imports from the old path to the new path.
 * It helps prevent import errors in files that haven't been updated yet.
 */

export { useAuth, AuthProvider, default as AuthContext } from '../context/AuthContext'; 