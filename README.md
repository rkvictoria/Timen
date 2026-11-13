# Timen

Timen is a mobile time-tracking and team-management application. It allows companies to register workplaces, generate QR Codes for those locations, and monitor employee clock-in and clock-out records.

The project is built with React Native and Expo, with local SQLite persistence. The experience is primarily designed for Android and iOS, with partial web support for screens that do not depend on native features.

## Features

### Access and authentication

- Welcome screen with login access.
- Company registration and first administrator account creation.
- E-mail and password login.
- Passwords stored locally as hashes using `bcryptjs`.
- Session persistence on the device with AsyncStorage.
- Automatic session locking when the application is reopened.
- Biometric unlock when the device has biometric hardware and enrollment.
- Option to sign in with another account from the lock screen.
- Mandatory temporary-password change on an employee's first access.
- Employee activation and deactivation by administrators.
- Organization-scoped data access.

### Employee experience

- Personalized greeting with the user's name, time of day, and current date.
- Contextual weather message.
- Current-weather lookup using the device location and WeatherAPI.
- Clock-in and clock-out through workplace QR Codes.
- Current-location validation against the workplace and its allowed radius.
- Biometric confirmation before recording attendance.
- QR Code scanning through the device camera.
- Distance display relative to the workplace.
- Location status display:
  - Location allowed.
  - Outside the allowed radius.
  - Permission or location unavailable.
- Daily work-session summary.
- Worked-hours indicator.
- Attendance history by day.
- Worked-time calculation per day and across the history.
- Workplace display for each attendance record.
- Profile first-name, last-name, password, and photo editing.
- E-mail and workplace display.
- Logout.

### Administrator experience

- Dashboard with a personalized greeting and weather message.
- Team status summary:
  - Working.
  - On break.
  - Finished.
  - No attendance record.
- Present employee count.
- Registered workplace count.
- Workplace creation.
- Individual QR Code generation for each workplace.
- Selection between registered QR Codes.
- Employee creation with:
  - First name.
  - Last name.
  - E-mail.
  - Temporary password.
  - Workplace.
- Employee activation and deactivation.
- Team attendance history by date.
- Calendar showing days with attendance records.
- Attendance time, duration, and workplace lookup.
- Company name, e-mail, name, last name, and photo editing.
- Main workplace location configuration:
  - Map-based point selection.
  - Current-device location.
  - Allowed radius in meters.
- Configured workplace-location removal.

## Main workflow

### Initial company setup

1. The user opens **Sign in**.
2. The user selects company registration.
3. The user provides first name, last name, company, e-mail, and password.
4. The account is created as an administrator.
5. The administrator opens the dashboard.
6. The administrator creates one or more workplaces.
7. The administrator generates a QR Code for each workplace.
8. The administrator creates employees and assigns each one to a workplace.

### Attendance registration

1. The employee opens the Home screen.
2. The application requests location permission.
3. The screen displays the distance to the configured workplace.
4. The employee must be within the allowed radius.
5. The application requests biometric confirmation when available.
6. The employee scans the workplace QR Code.
7. The attendance record is saved with date, time, workplace, and QR Code identifiers.
8. The daily session and history are updated.

The current workflow has one pair of records per day: **Entry** and **Exit**. The point service controls the order and prevents duplicate records of the same type on the same day.

## Technology stack

### Application

- [React Native](https://reactnative.dev/) `0.88.1`
- [React](https://react.dev/) `19.3.0`
- [Expo](https://expo.dev/) `58`
- React Navigation is used instead of Expo Router.

### Navigation and interface

- `@react-navigation/native`
- `@react-navigation/native-stack`
- `react-native-safe-area-context`
- `@expo/vector-icons`
- `expo-status-bar`
- React Native components
- `Animated` for transitions and interaction feedback

### Device capabilities

- `expo-camera` for QR Code scanning.
- `expo-location` for location, geofencing, and weather lookup.
- `expo-local-authentication` for biometrics.
- `expo-image-picker` for profile photos.
- `react-native-maps` for workplace-location setup and display.

### Data and security

- `expo-sqlite` for the local database.
- `@react-native-async-storage/async-storage` for session persistence.
- `bcryptjs` for password hashing.
- `expo-crypto` for UUID and random-value generation.
- `react-native-qrcode-svg` for QR Code generation.

### Weather

- WeatherAPI Current Weather API.
- Lookup by latitude and longitude.
- Portuguese messages based on:
  - Rain.
  - Storms.
  - Snow.
  - Fog and cloudy conditions.
  - High temperatures.
  - Low temperatures.
  - Pleasant weather.

## Architecture

```text
Timen/
├── App.js
├── app.json
├── app.config.js
├── index.js
├── package.json
├── assets/
└── src/
    ├── components/
    ├── constants/
    ├── contexts/
    ├── database/
    ├── hooks/
    ├── navigation/
    ├── screens/
    ├── services/
    ├── styles/
    └── utils/
```

### Main responsibilities

- `src/navigation/`: defines routes and controls which screens are available for each authentication state.
- `src/contexts/`: maintains the session, current user, access role, and biometric lock state.
- `src/hooks/`: exposes context access hooks.
- `src/screens/`: flow, login, attendance-validation, and administration screens.
- `src/components/`: reusable Home, dashboard, history, profile, and lock-screen sections.
- `src/services/`: authentication, attendance, workplace, and weather business logic.
- `src/database/`: SQLite initialization, configuration, and migration.
- `src/utils/`: date, time, and duration formatting.
- `src/constants/`: shared keys and values.

## Navigation

### Unauthenticated user

- `Welcome`
- `Login`

### Authenticated and locked session

- `Lock`

### Employee's first access

- `ChangePassword`

### Authenticated user

- `Home`
- `PointValidation` for employees
- `QrCodes` for administrators
- `Members` for administrators

History, profile, and attendance registration are accessed through the Home screen's bottom navigation. History content changes according to the user's role.

## Local database

The SQLite database is created as `timen.db` and uses:

- WAL mode for improved read/write behavior.
- Foreign keys enabled.
- Version control through `PRAGMA user_version`.
- Migrations defined in `src/database/db.js`.

### Tables

#### `organizations`

Stores companies registered on the device.

#### `users`

Stores administrators and employees, including:

- Personal information.
- E-mail.
- Password hash.
- Role (`manager` or `member`).
- Active status.
- Photo.
- Workplace.
- Allowed coordinates and radius.

#### `locations`

Stores workplaces registered by each organization. The workplace name is unique within an organization.

#### `attendance`

Stores attendance records:

- User.
- Date.
- Point type.
- Timestamp.
- Location ID.
- Location name.

## QR Codes

Each QR Code contains a JSON payload:

```json
{
  "app": "Timen",
  "type": "workplace",
  "orgId": "organization-id",
  "qrId": "location-id",
  "workplace": "Workplace name"
}
```

The QR Code identifies the workplace associated with an attendance record. It is generated on the administrator's device and scanned using the employee's camera.

## WeatherAPI configuration

Create an account at [WeatherAPI](https://www.weatherapi.com/) and obtain an API key.

Create a `.env` file in the project root:

```env
WEATHER_API_KEY=your_weatherapi_key
```

The Expo public-variable format is also supported:

```env
EXPO_PUBLIC_WEATHER_API_KEY=your_weatherapi_key
```

The `.env` file is included in `.gitignore` and must not be committed.

The key is forwarded through [app.config.js](./app.config.js) and read by `expo-constants`. Since the WeatherAPI key is consumed by the mobile client, it should be treated as a public key and restricted through the provider whenever possible.

## Permissions

The application may request:

- **Foreground location:** weather lookup, radius validation, and workplace setup.
- **Camera:** QR Code scanning.
- **Biometrics:** session unlock and attendance confirmation.
- **Photo library:** profile-photo updates.

Location and camera permission messages are configured in `app.json`.

## Running the project

### Requirements

- Node.js LTS.
- npm.
- Android Studio and an Android emulator, or a physical device.
- Xcode for native iOS execution.
- Expo CLI through `npx`.

### Installation

```bash
npm install
```

### Start the project

```bash
npm start
```

### Run on Android

```bash
npm run android
```

### Run on iOS

```bash
npm run ios
```

### Run on the web

```bash
npm run web
```

Web support is partial. Features such as maps, camera, biometrics, SQLite, and location may depend on the browser and environment.

### Clear the Metro/Expo cache

```bash
npx expo start -c
```

Restart with a clean cache after changing `.env` or `app.config.js`.

## Available scripts

| Command | Description |
| --- | --- |
| `npm start` | Starts the Expo server |
| `npm run android` | Starts the project on Android |
| `npm run ios` | Starts the project on iOS |
| `npm run web` | Starts the project on the web |

## Current limitations

- Data is local to the device; there is no backend or cross-device synchronization.
- Sessions, users, workplaces, and attendance records are not automatically shared between devices.
- The WeatherAPI key is consumed by the client application.
- Web support does not cover all mobile features.
- The current attendance model has one entry and one exit per day.
- Employees are not physically deleted; they are deactivated and their records are preserved.
- The application depends on system permissions for location, camera, biometrics, and the photo library.

## Data organization and isolation

Administrative operations verify the user's role and filter data by `organization_id`. This keeps users, workplaces, and attendance records separated between companies within the local database.

Because storage is local, this isolation protects data inside the device database but does not replace backend security controls for a distributed or multi-device environment.

## License

See [LICENSE](./LICENSE) for the project's usage and distribution terms.
