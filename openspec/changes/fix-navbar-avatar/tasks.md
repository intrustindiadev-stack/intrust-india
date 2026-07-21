## 1. Avatar Styling Fixes

- [x] 1.1 Update `Navbar.jsx` desktop profile `<Image>` component to explicitly include the `rounded-full` className, and ensure the closest parent `<div className="relative">` respects `overflow-hidden` correctly or the `<Image fill>` properly rounds itself.
- [x] 1.2 Verify and adjust `MobileNav.jsx` and mobile profile `<img />` tags in `Navbar.jsx` to ensure they also render with a perfect border-radius.

## 2. Image Load Error Fallbacks

- [x] 2.1 Introduce image error state variables in `Navbar.jsx` for desktop and mobile view avatars.
- [x] 2.2 Attach an `onError` handler to the `<Image>` and `<img />` tags that sets the error state to true if the profile picture fails to load.
- [x] 2.3 Add conditional rendering to display `displayInitial(profile, user)` when the image error state is true.
- [x] 2.4 Verify similar fallback is handled correctly in `MobileNav.jsx` if applicable.
