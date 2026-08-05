# Ten Of Cups Camp Manager

Project Name

Ten Of Cups Camp Manager

Purpose

Build a professional, responsive web application for managing accommodation on a private game farm.

The application will be self-hosted on a Linux Apache server using Laravel, PHP 8.3 and PostgreSQL.

Authentication must require login before any data can be viewed.

Branding

Company Name:

Ten of Cups Camp Manager

Primary colours:

Forest Green (#2F5D50)

Gold (#C8A14B)

Cream (#F8F5EC)

Use the supplied company logo throughout the application.

Professional safari lodge styling.

Dashboard

After login display:

Total Camps

Total Buildings

Total Rooms

Available Rooms

Occupied Rooms

Rooms Awaiting Cleaning

Rooms Under Maintenance

Arrivals Today

Departures Today

Calendar showing current occupancy

Quick Actions

Allocate Room

Check Out

Mark Room Clean

Create Booking

Camp Management

Create multiple camps.

Each camp contains:

Buildings

Room Types

Housekeeping Staff

Buildings

Each camp can contain multiple buildings.

Store:

Building Name

Description

Status

Rooms

Each room belongs to a building.

Store:

Room Number

Twin/Double

Maximum Occupancy

Status

Available

Occupied

Cleaning Required

Out of Service

Maintenance Notes

Team Members

Store:

Employee Number

Name

Surname

Department

Phone

Email

Vehicle Registration

Emergency Contact

Notes

Room Allocation

Allocate people to rooms.

Store:

Arrival Date

Departure Date

Room

Bed A

Bed B

Department

Comments

Prevent double booking.

Calendar

Display occupancy in monthly calendar format.

Colour code:

Green = Available

Blue = Occupied

Orange = Cleaning Required

Red = Maintenance

Housekeeping

Dashboard showing:

Rooms to Clean

Cleaning Started

Cleaning Complete

Ready for Occupancy

Cleaning History

Cleaning Notes

Maintenance

Report room faults.

Track:

Reported By

Priority

Description

Status

Completed Date

Reports

Occupancy Report

Room History

Cleaning Report

Maintenance Report

Current Guests

Available Rooms

User Roles

Administrator

Manager

Housekeeping

Read Only

Database

PostgreSQL

Laravel Eloquent

Soft Deletes

UUID Primary Keys

Audit timestamps

Technology

Laravel 12

PHP 8.3

Bootstrap 5

PostgreSQL

Blade Templates

Responsive Design

Dark Mode

Deliverables

Generate the complete Laravel project including:

Authentication

Database migrations

Models

Controllers

Policies

Seeders

Factories

Blade views

Dashboard

CRUD pages

Calendar

Housekeeping

Reports

Responsive layout

Professional UI

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://safari-camp-cozy.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/5080b3d8-49fa-4829-8a71-b2593b4fd530).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
