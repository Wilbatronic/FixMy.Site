/**
 * Asset loader utility to handle missing assets gracefully
 */

// Fallback images for missing assets
const FALLBACK_IMAGES = {
  logo: '/FixMySite_Logo_Transparent.png',
  vite: '/vite.svg',
  default: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjNmNGY2Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzY2NzM4NyIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkltYWdlIG5vdCBmb3VuZDwvdGV4dD48L3N2Zz4='
};

/**
 * Load an image with fallback handling
 * @param {string} src - The image source URL
 * @param {string} fallbackType - The type of fallback to use
 * @returns {Promise<string>} - The resolved image URL
 */
export const loadImage = async (src, fallbackType = 'default') => {
  try {
    const response = await fetch(src, { method: 'HEAD' });
    if (response.ok) {
      return src;
    }
  } catch (error) {
    console.warn(`Failed to load image: ${src}`, error);
  }
  
  // Return fallback image
  return FALLBACK_IMAGES[fallbackType] || FALLBACK_IMAGES.default;
};

/**
 * Create an image element with error handling
 * @param {string} src - The image source URL
 * @param {string} alt - Alt text for the image
 * @param {string} fallbackType - The type of fallback to use
 * @returns {HTMLImageElement} - The image element
 */
export const createImageWithFallback = (src, alt = '', fallbackType = 'default') => {
  const img = new Image();
  img.alt = alt;
  
  img.onerror = () => {
    console.warn(`Image failed to load: ${src}, using fallback`);
    img.src = FALLBACK_IMAGES[fallbackType] || FALLBACK_IMAGES.default;
  };
  
  img.src = src;
  return img;
};

/**
 * Get the correct asset URL with fallback
 * @param {string} assetPath - The asset path
 * @param {string} fallbackType - The type of fallback to use
 * @returns {string} - The asset URL
 */
export const getAssetUrl = (assetPath, fallbackType = 'default') => {
  if (!assetPath) {
    return FALLBACK_IMAGES[fallbackType] || FALLBACK_IMAGES.default;
  }
  
  // If it's already a full URL, return as is
  if (assetPath.startsWith('http://') || assetPath.startsWith('https://') || assetPath.startsWith('data:')) {
    return assetPath;
  }
  
  // If it's a relative path, ensure it starts with /
  if (!assetPath.startsWith('/')) {
    assetPath = '/' + assetPath;
  }
  
  return assetPath;
};

/**
 * Preload critical assets to prevent loading issues
 */
export const preloadAssets = () => {
  const criticalAssets = [
    '/FixMySite_Logo_Transparent.png',
    '/vite.svg'
  ];
  
  criticalAssets.forEach(asset => {
    const img = new Image();
    img.src = asset;
    img.onerror = () => console.warn(`Failed to preload asset: ${asset}`);
    img.onload = () => console.log(`Successfully preloaded asset: ${asset}`);
  });
};

/**
 * Create a robust image element with error handling
 * @param {Object} props - Image props
 * @returns {HTMLImageElement} - Image element with error handling
 */
export const createRobustImage = ({ src, alt, className, fallbackType = 'default', ...props }) => {
  const img = document.createElement('img');
  
  if (src) img.src = src;
  if (alt) img.alt = alt;
  if (className) img.className = className;
  
  // Apply additional props
  Object.keys(props).forEach(key => {
    if (props[key] !== undefined) {
      img.setAttribute(key, props[key]);
    }
  });
  
  const handleError = (e) => {
    console.warn(`Image failed to load: ${src}, using fallback`);
    e.target.src = FALLBACK_IMAGES[fallbackType] || FALLBACK_IMAGES.default;
  };

  const handleLoad = () => {
    console.log(`Image loaded successfully: ${src}`);
  };
  
  img.addEventListener('error', handleError);
  img.addEventListener('load', handleLoad);
  
  return img;
};
