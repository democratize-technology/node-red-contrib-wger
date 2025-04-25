# node-red-contrib-wger

Node-RED nodes for integrating with the [wger](https://wger.de) workout and fitness tracker API.

## Overview

This package provides a comprehensive set of Node-RED nodes for interacting with the wger API, allowing you to:

- Search and manage exercises
- Create and manage workout plans
- Track nutrition and meals
- Log weight measurements
- Manage user profiles

## Installation

Install via Node-RED's palette manager or run:

```bash
npm install node-red-contrib-wger
```

## Configuration

### Authentication

The wger API supports several authentication methods:

1. **None** - For public endpoints (limited access)
2. **Token** - Uses a permanent API token
3. **JWT** - Uses JSON Web Tokens

To get an API token:
1. Create an account at [https://wger.de](https://wger.de)
2. Go to your profile settings
3. Generate an API token

## Nodes

### wger-config
Configuration node for connecting to a wger API instance.

### wger-exercise
Manage exercise-related operations:
- List exercises
- Search exercises
- Get exercise details
- Get exercise images
- Get exercise comments
- Get categories, muscles, equipment

### wger-workout
Manage workout plans and sessions:
- List, create, update, delete workouts
- Manage workout days
- Manage exercise sets
- Get workout canonical representations
- View workout logs

### wger-nutrition
Manage nutrition plans:
- List, create, update, delete plans
- Get nutritional values
- Manage meals and ingredients

### wger-weight
Track weight measurements:
- List weight entries
- Create new entries
- Update/delete entries
- Get statistical data

### wger-user
Manage user profiles:
- Get/update user profile
- Manage settings

### wger-api
Generic API node for custom operations not covered by the specialized nodes.

## Examples

The package includes several example flows:
- Exercise search
- Workout creation
- Nutrition plan management
- Weight tracking

Find these in the Node-RED import menu under "Examples".

## Usage Examples

### Searching for Exercises

```javascript
msg.payload = {
    term: "bench press",
    language: "en"
};
msg.operation = "searchExercises";
return msg;
```

### Creating a Workout

```javascript
// Create workout
msg.payload = {
    name: "Full Body Workout",
    description: "A comprehensive routine"
};
msg.operation = "createWorkout";

// After receiving workout ID, create a day
msg.payload = {
    description: "Monday - Chest",
    workout: workoutId,
    day: [1]
};
msg.operation = "createDay";

// Add exercises to the day
msg.payload = {
    exerciseday: dayId,
    exercise: exerciseId,
    sets: 3,
    repetitions: 10
};
msg.operation = "createSet";
```

## Error Handling

All nodes provide error outputs and status indicators:
- Blue dot: Processing request
- Green dot: Success
- Red dot/ring: Error occurred

Errors include details about the API response when available.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - see LICENSE file for details.

## Resources

- [wger API Documentation](https://wger.readthedocs.io/en/latest/api.html)
- [wger Official Website](https://wger.de)
- [GitHub Repository](https://github.com/wger-project/wger)

## Support

For issues and feature requests, please use the [GitHub issue tracker](https://github.com/yourusername/node-red-contrib-wger/issues).
