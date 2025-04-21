/**
 * URL parameter utilities
 */

/**
 * Get a parameter value from a URL query string
 * @param search The URL search string (e.g., '?code=123&state=abc')
 * @param param The parameter name to extract
 * @returns The parameter value or null if not found
 */
export const getParam = (search: string, param: string): string | null => {
  const searchParams = new URLSearchParams(search);
  return searchParams.get(param);
};

/**
 * Build a URL with query parameters
 * @param baseUrl The base URL
 * @param params Object with parameters to add
 * @returns URL with query parameters
 */
export const buildUrl = (baseUrl: string, params: Record<string, string>): string => {
  const url = new URL(baseUrl);
  Object.entries(params).forEach(([key, value]) => {
    if (value) {
      url.searchParams.append(key, value);
    }
  });
  return url.toString();
};

/**
 * Parse URL query parameters into an object
 * @param search The URL search string
 * @returns Object with all parameters
 */
export const parseQueryParams = (search: string): Record<string, string> => {
  const params: Record<string, string> = {};
  const searchParams = new URLSearchParams(search);
  searchParams.forEach((value, key) => {
    params[key] = value;
  });
  return params;
}; 