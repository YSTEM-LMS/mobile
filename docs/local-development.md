# Emulator and simulator setup

Use this guide to install and launch a virtual phone for the mobile app.
Review [what you'll need](../README.md#what-youll-need), then complete the
[installation](../README.md#install) and
[environment setup](../README.md#configure-the-environment) in the README
before launching the app. Choose the platform below for your computer.

## Choose your platform

| Your computer | Android Emulator       | iOS Simulator               |
| ------------- | ---------------------- | --------------------------- |
| Windows       | Use Android Studio     | Unavailable; requires a Mac |
| macOS         | Can use Android Studio | Use Xcode                   |

You only need one platform to start. Windows contributors should use Android;
Mac contributors should use Xcode.
[Expo iOS setup guide](https://docs.expo.dev/workflow/ios-simulator/).

## Android: install Android Studio on Windows or macOS

### Install the application and SDK

1. Download [Android Studio](https://developer.android.com/studio).
   Check its [system requirements](https://developer.android.com/studio/install)
   before downloading, especially for older computers or Windows ARM devices.
2. **Windows:** run the installer and include Android Virtual Device if the
   component selector appears. **macOS:** choose the download for Apple silicon
   or Intel, open the `.dmg`, and drag Android Studio into Applications.
3. Open Android Studio and finish the **Standard** setup wizard. Accept the
   component licenses and allow the SDK downloads to finish.
4. From the welcome screen, open **More Actions > SDK Manager**. In an open
   project, use **Tools > SDK Manager**.
5. In **SDK Platforms**, install a current stable Android platform. In
   **SDK Tools**, ensure **Android SDK Platform-Tools**, **Android Emulator**,
   and **Android SDK Build-Tools** are installed. Apply the changes.
6. Copy the **Android SDK Location** shown in SDK Manager for the next step.

You can continue using your usual editor for the app's TypeScript files.
Android Studio provides the SDK and virtual phone for this workflow.
See [Android's installation instructions](https://developer.android.com/studio/install).

### Make the Android tools available in your terminal

**Windows:** search Start for **Edit environment variables for your account**.
Under user variables, add `ANDROID_HOME` with the SDK location from Android
Studio, usually `C:\Users\YOUR_USERNAME\AppData\Local\Android\Sdk`.
Edit the user `Path` and add these two entries, keeping existing entries:

```text
%ANDROID_HOME%\platform-tools
%ANDROID_HOME%\emulator
```

**macOS:** open `~/.zshrc` in your editor and add the following lines. Replace
the SDK path if Android Studio shows a different location. If you use Bash,
put these in `~/.bash_profile` instead.

```bash
export ANDROID_HOME="$HOME/Library/Android/sdk"
export PATH="$PATH:$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator"
```

On either OS, reopen your terminal and editor so they receive the updated
environment. Check:

```bash
adb --version
emulator -list-avds
```

The first command should print an Android Debug Bridge version. The second
may be empty until you create a virtual device. See
[Expo's Android environment setup](https://docs.expo.dev/workflow/android-studio-emulator/).

### Enable acceleration on Windows

If virtualization is disabled, enable Intel VT-x or AMD SVM/AMD-V in your
computer's BIOS/UEFI using the manufacturer's instructions. In Windows,
open **Turn Windows features on or off**, enable **Windows Hypervisor
Platform**, and restart when requested. On a managed computer, ask IT if
these settings are locked.

After reopening a terminal, run:

```bash
emulator -accel-check
```

It should report an installed, usable hypervisor. macOS uses its built-in
hypervisor. Details are in Android's
[hardware acceleration guide](https://developer.android.com/studio/run/emulator-acceleration).

### Create and start a virtual phone

1. On Android Studio's welcome screen, choose **More Actions > Virtual Device
   Manager**. With a project open, use **Tools > Device Manager**.
2. Choose **Create Virtual Device** or **Create Device**, then select a Pixel
   phone profile and continue.
3. Choose a stable system image, download it, and finish the wizard. A Google
   APIs image is a suitable starting point. Use an `arm64-v8a` image on Apple
   silicon and an `x86_64` image on Intel/AMD computers so the image matches
   the host architecture.
4. Click the device's **Play** button and wait for the Android home screen.
5. In your terminal, run:

```bash
adb devices
```

Expect an emulator entry such as `emulator-5554` with status `device`. Keep
one emulator running for your first launch. Menu labels can vary by Android
Studio version; see
[Create and manage virtual devices](https://developer.android.com/studio/run/managing-avds)
and the [architecture requirements](https://developer.android.com/studio/run/emulator-acceleration).

**Recommended device:** Use a standard Pixel phone profile, such as a Pixel 7
or Pixel 8, with a stable Google APIs system image that matches your computer's
architecture. If your computer struggles to run it, another standard phone
profile is fine.

### Launch this project on Android

From the mobile repository root:

```bash
npm run android
```

This starts Expo and opens the app in the emulator. Accept any prompt to
install or open the matching Expo Go client. This project currently uses
Expo SDK 57. See [Expo's emulator guide](https://docs.expo.dev/workflow/android-studio-emulator/).

If `npm start` is already running, press `a` in that terminal instead of
starting a second server. Leave the terminal running while developing.

## iOS: install Xcode on macOS

Windows contributors should use the Android instructions above.

### Install Xcode and a simulator runtime

1. Install [Xcode from the Mac App Store](https://apps.apple.com/app/xcode/id497799835).
   Check the listed macOS requirement and allow space and time for the download.
2. Open Xcode, accept the license, and complete its initial component setup.
3. Open **Xcode > Settings > Locations** and select your installed Xcode
   version under **Command Line Tools**.
4. Open **Xcode > Settings > Components** (called **Platforms** in some
   versions). Download an iOS Simulator runtime under iOS platform support.
   See [Apple's component installation guide](https://developer.apple.com/documentation/xcode/downloading-and-installing-additional-xcode-components).
5. Open **Xcode > Open Developer Tool > Simulator**, or run:

```bash
open -a Simulator
```

Choose an iPhone from **File > Open Simulator**. If none is available, open
**Xcode > Window > Devices and Simulators > Simulators**, click **+**, and
create an iPhone simulator using the installed iOS runtime. Wait for its
home screen. See [Expo's Xcode setup instructions](https://docs.expo.dev/workflow/ios-simulator/).

**Recommended device:** Use a standard iPhone simulator included with your
installed Xcode runtime. Avoid using an iPad or unusually large device for the
initial setup. The exact iPhone model does not need to match other team
members.

### Launch this project on iOS

Select the iOS Simulator URL described in
[Environment configuration](environments.md#local-setup). From the mobile
repository root, run:

```bash
npm run ios
```

Accept the prompt to open Expo Go in the simulator. If Expo is already
running, press `i` in that terminal; use `Shift+i` to choose a simulator.
Leave the terminal running while developing.

## Daily use

### Configure the backend services

Copy `.env.example` to `.env.local` if you have not already created it. The
Android emulator examples are:

```text
EXPO_PUBLIC_APP_ENV=development
EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:8000
EXPO_PUBLIC_CHESS_SOCKET_URL=http://10.0.2.2:3001
EXPO_PUBLIC_STOCKFISH_SOCKET_URL=http://10.0.2.2:8080
```

- `API_BASE_URL` points to the main API for accounts and learning data.
- `CHESS_SOCKET_URL` points to the live chess service.
- `STOCKFISH_SOCKET_URL` points to the computer opponent's engine service.
- `APP_ENV` selects the URL validation rules. Development accepts HTTP/HTTPS
  for all services; preview and production require HTTPS.

`10.0.2.2` reaches the development computer from the standard Android emulator.
For an iOS simulator on the same Mac, replace it with `localhost`. For a
physical phone, use the development computer's LAN address. Keep the protocol
and port appropriate to each service; the ports above are examples.

All settings must be present even when a service is not running. A valid
address does not start a server or prove connectivity. If you already have an
`.env.local`, add the two socket settings; do not overwrite your existing API
address. Restart Expo after changing the file (`npx expo start --clear` if it
keeps using old values).

Every `EXPO_PUBLIC_` value is visible in the built app. Use only public
configuration, never passwords, tokens, database credentials, or other secrets.
See [Environment configuration](environments.md) for the complete rules.

### Run the app

Start your virtual phone, open a terminal in the mobile repository, and run
`npm run android` or `npm run ios`. Stop Expo with `Ctrl+C` when finished.
For project checks, return to the [README](../README.md#quality-checks).

## Troubleshooting

| Problem                                   | What to check                                                                                                                                                            |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Android SDK or `adb` cannot be found      | Compare `ANDROID_HOME` with SDK Manager's location, check both Path entries, then restart your terminal/editor.                                                          |
| No Android device found                   | Start the virtual phone in Device Manager, wait for its home screen, and check `adb devices` for status `device`.                                                        |
| Android emulator is slow or fails to boot | Check `emulator -accel-check`, virtualization, and the system image architecture. Try Device Manager's **Cold Boot** action and close other resource-heavy applications. |
| No iOS simulators available               | Install an iOS runtime in Xcode Settings, create a simulator, and open it manually before retrying.                                                                      |
| Xcode license or command-line tools error | Open Xcode to finish setup and accept its license. Confirm the selected Command Line Tools version under Settings > Locations.                                           |
| Expo reports an incompatible client       | Use an Expo Go version matching the project's SDK 57. Follow the device-specific download instructions at [Expo Go](https://expo.dev/go).                                |
| App cannot connect to Metro               | Keep the Expo terminal running. Check the host firewall permits Node/Expo on your development network and retry without a VPN if it interferes with local connections.   |

If Expo keeps using stale configuration or bundles, stop it with `Ctrl+C`
and restart with a cleared Metro cache:

```bash
npx expo start --clear
```

Then press `a` for Android or `i` for iOS. If you still need help, share your
OS, Node/npm versions, chosen virtual device, command, and error message
with the team. Do not include secrets or private configuration.
