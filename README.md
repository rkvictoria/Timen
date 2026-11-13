# Timen

Timen is a mobile time-tracking and team-management application. It allows companies to register workplaces, generate QR Codes for those locations, and monitor employee clock-in and clock-out records.

The project is built with React Native and Expo, with local SQLite persistence. The experience is primarily designed for Android and iOS, with partial web support for screens that do not depend on native features.

## Features

<table>
<tr>
<td valign="top" width="50%">

### Access and authentication

- Welcome screen and company registration.
- Administrator account creation.
- E-mail/password login with local `bcryptjs` hashes.
- Session persistence with AsyncStorage.
- Automatic session lock on app reopening.
- Biometric unlock when available.
- Sign in with another account from the lock screen.
- Mandatory temporary-password change on first employee access.
- Employee activation/deactivation.
- Organization-scoped data access.

</td>
<td valign="top" width="50%">

### Employee experience

- Personalized greeting, date, and contextual weather message.
- Weather lookup using device location and WeatherAPI.
- Entry/exit through workplace QR Codes.
- Location and allowed-radius validation.
- Biometric confirmation before attendance registration.
- Camera-based QR Code scanning.
- Distance and location-status display.
- Daily work-session and worked-hours summary.
- Attendance history and worked-time calculation.
- Workplace display for each record.
- Profile name, password, and photo editing.
- E-mail display and logout.

</td>
</tr>
<tr>
<td valign="top">

### Administrator experience

- Dashboard with greeting, weather, team status, and present-employee count.
- Workplace creation and registered-workplace count.
- Individual QR Code generation and selection.
- Employee creation with name, e-mail, temporary password, and workplace.
- Employee activation and deactivation.
- Team history by date with calendar, times, duration, and workplace.
- Company name, e-mail, name, last name, and photo editing.
- Main workplace location setup:
  - Map point or current-device location.
  - Allowed radius in meters.
- Configured workplace-location removal.

</td>
<td valign="top">

### Team status

The administrator dashboard classifies each employee as:

- Working.
- On break.
- Finished.
- No attendance record.

The current employee experience also reports:

- Location allowed.
- Outside the allowed radius.
- Permission or location unavailable.

</td>
</tr>
</table>

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

| Area | Technologies and responsibilities |
| --- | --- |
| Application | [React Native](https://reactnative.dev/) `0.88.1`, [React](https://react.dev/) `19.3.0`, [Expo](https://expo.dev/) `58` |
| Navigation and UI | `@react-navigation/native`, native stack, safe areas, vector icons, status bar, React Native components, and `Animated` |
| Device capabilities | `expo-camera`, `expo-location`, `expo-local-authentication`, `expo-image-picker`, and `react-native-maps` |
| Data and security | `expo-sqlite`, AsyncStorage, `bcryptjs`, `expo-crypto`, and `react-native-qrcode-svg` |
| Weather | WeatherAPI Current Weather API queried by latitude/longitude, with Portuguese messages for rain, storms, snow, cloudy, hot, cold, and pleasant conditions |

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

| Directory | Responsibility |
| --- | --- |
| `src/navigation/` | Routes and authentication-state screen access |
| `src/contexts/` | Session, current user, role, and biometric lock state |
| `src/hooks/` | Context access hooks |
| `src/screens/` | Login, attendance-validation, and administration screens |
| `src/components/` | Home, dashboard, history, profile, and lock-screen sections |
| `src/services/` | Authentication, attendance, workplace, and weather business logic |
| `src/database/` | SQLite initialization, configuration, and migrations |
| `src/utils/` | Date, time, and duration formatting |
| `src/constants/` | Shared keys and values |

## Navigation

| State | Available screens |
| --- | --- |
| Unauthenticated | `Welcome`, `Login` |
| Authenticated and locked | `Lock` |
| Employee's first access | `ChangePassword` |
| Authenticated employee | `Home`, `PointValidation` |
| Authenticated administrator | `Home`, `QrCodes`, `Members` |

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
