# Black Trucks Co — What We Built Today

## Database
- Connected the app to MongoDB Atlas (cloud database)
- All vehicles, users, bookings, and promo codes are now saved in the database
- Added 10 vehicles to the database including the 4 new black fleet cars (Black Escalade, Black Yukon XL, Black Suburban, Black Sprinter Van)
- Added 2 default accounts: Admin and Driver
- Added 3 promo codes: WELCOME20, FLAT15, VIP30

## User Accounts
- Users can now create an account (Sign Up)
- Users can log in and log out
- When logged in, the user's name appears in the top right of the navbar
- Admin users see an "Admin Dashboard" button in the navbar
- Regular users see a "My Bookings" button in the navbar

## Booking Flow (Step by Step)
The booking process now has 4 steps:
1. **Choose a Service** — user picks what type of ride they need (Corporate, Airport, Wedding, etc.)
2. **Enter Locations** — pickup and drop-off address with autocomplete suggestions as you type
3. **Pick Date & Time** — choose when the ride is needed
4. **Summary** — review everything before selecting a vehicle

After the 4 steps, the user picks a vehicle and goes to checkout.

## Address Autocomplete
- When typing a pickup or drop-off address, suggestions appear automatically
- Powered by OpenRouteService (free, no credit card needed)

## Distance Calculation
- The app automatically calculates the real distance and travel time between pickup and drop-off
- This is used to calculate the ride price

## Checkout & Payment
- Users must be logged in before they can pay (if not logged in, they are sent to the login page and brought back after)
- Two payment options: **Cash** (pay the driver on the day) or **Card** (via Stripe)
- Users can apply a promo code for a discount
- Price breakdown shows: ride cost + service fee + tax + any discount

## Confirmation Email
- After a cash booking is confirmed, an email is automatically sent to the user
- The email includes booking reference, pickup, drop-off, date, time, vehicle, and total amount
- For cash bookings, the email reminds the user to have cash ready for the driver

## My Bookings Page
- Logged-in users can visit `/bookings` to see all their past and upcoming bookings
- Each booking shows: reference number, status, pickup/drop-off, date, vehicle, and total
- Users can cancel a pending or confirmed booking from this page

## Admin Dashboard
- Admins can visit `/admin` to see a summary: total revenue, total bookings, confirmed, completed, cancelled
- Admins can view and manage all bookings at `/admin/bookings`
- Admins can change the status of any booking (e.g. confirm, assign driver, complete)

## Services Page
- New `/services` page showing all 8 service types with descriptions and highlights
- Each service has a "Book This Service" button that takes the user directly to the booking form with that service pre-selected

## Footer
- Updated footer with the company logo (same as navbar)
- Social media icons: Instagram, Facebook, X, TikTok, YouTube
- Instagram and TikTok linked to real Black Trucks Co accounts
- All nav links in the center of the footer

## Booking Data Handling
- Booking data now uses session storage instead of local storage
- This means if you reload the page or close the tab, the booking form resets automatically — no stale data

## Build
- The project builds successfully with no errors
- All pages and API routes are working

---

## Credentials (for testing)

| Role  | Email                    | Password     |
|-------|--------------------------|--------------|
| Admin | admin@blacktrucks.co     | admin123456  |
| Driver| driver@blacktrucks.co    | admin123456  |

## Promo Codes (for testing)

| Code      | Discount         | Min Order |
|-----------|------------------|-----------|
| WELCOME20 | 20% off          | $50       |
| FLAT15    | $15 off          | $80       |
| VIP30     | 30% off          | $150      |
