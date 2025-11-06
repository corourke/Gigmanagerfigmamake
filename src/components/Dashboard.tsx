import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import {
  Building2,
  LayoutDashboard,
  Calendar,
  Users,
  Package,
  Settings,
  LogOut,
  SwitchCamera,
} from 'lucide-react';
import type { Organization, User } from '../App';

interface DashboardProps {
  organization: Organization;
  user: User;
  onBackToSelection: () => void;
  onLogout: () => void;
  onNavigateToGigs?: () => void;
}

export default function Dashboard({
  organization,
  user,
  onBackToSelection,
  onLogout,
  onNavigateToGigs
}: DashboardProps) {
  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName[0]}${lastName[0]}`.toUpperCase();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Top Bar */}
          <div className="flex items-center justify-between h-16 border-b border-gray-100">
            <div className="flex items-center gap-4">
              <div className="inline-flex items-center justify-center w-10 h-10 bg-sky-500 rounded-lg">
                <Building2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-gray-900">{organization.name}</h2>
                <p className="text-xs text-gray-500">Gig Manager</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={onBackToSelection}
                className="hidden sm:flex"
              >
                <SwitchCamera className="w-4 h-4 mr-2" />
                Switch Organization
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={user.avatar_url} alt={`${user.first_name} ${user.last_name}`} />
                      <AvatarFallback className="bg-sky-100 text-sky-700">
                        {getInitials(user.first_name, user.last_name)}
                      </AvatarFallback>
                    </Avatar>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div>
                      <p className="text-sm">{user.first_name} {user.last_name}</p>
                      <p className="text-xs text-gray-500">{user.email}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={onBackToSelection}>
                    <SwitchCamera className="w-4 h-4 mr-2" />
                    Switch Organization
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Settings className="w-4 h-4 mr-2" />
                    Settings
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={onLogout} className="text-red-600">
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Navigation Bar */}
          <nav className="flex items-center gap-1 h-12">
            <button className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-2">
              <LayoutDashboard className="w-4 h-4" />
              Dashboard
            </button>
            <button 
              onClick={onNavigateToGigs}
              className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-2"
            >
              <Calendar className="w-4 h-4" />
              Events
            </button>
            <button className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-2">
              <Users className="w-4 h-4" />
              Team
            </button>
            <button className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-2">
              <Package className="w-4 h-4" />
              Equipment
            </button>
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-gray-900 mb-2">Welcome back, {user.first_name}!</h1>
          <p className="text-gray-600">Here's what's happening with {organization.name}</p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card 
            className="p-4 cursor-pointer hover:shadow-lg transition-shadow"
            onClick={onNavigateToGigs}
          >
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-gray-600">Events</p>
              <Calendar className="w-5 h-5 text-sky-500" />
            </div>
            <div className="space-y-1">
              <div className="flex items-baseline justify-between">
                <p className="text-xs text-gray-500">Confirmed Events</p>
                <p className="text-gray-900">8</p>
              </div>
              <div className="flex items-baseline justify-between">
                <p className="text-xs text-gray-500">Pending Events</p>
                <p className="text-gray-900">4</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-gray-600">Team Members</p>
              <Users className="w-5 h-5 text-green-500" />
            </div>
            <div className="space-y-1">
              <div className="flex items-baseline justify-between">
                <p className="text-xs text-gray-500">Unconfirmed Slots</p>
                <p className="text-gray-900">12</p>
              </div>
              <div className="flex items-baseline justify-between">
                <p className="text-xs text-gray-500">Unfilled Slots</p>
                <p className="text-gray-900">5</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-gray-600">Equipment</p>
              <Package className="w-5 h-5 text-purple-500" />
            </div>
            <div className="space-y-1">
              <div className="flex items-baseline justify-between">
                <p className="text-xs text-gray-500">Equipment Rentals</p>
                <p className="text-gray-900">$12.3K</p>
              </div>
              <div className="flex items-baseline justify-between">
                <p className="text-xs text-gray-500">Rental Contracts</p>
                <p className="text-gray-900">23</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-gray-600">Revenue</p>
              <LayoutDashboard className="w-5 h-5 text-amber-500" />
            </div>
            <div className="space-y-1">
              <div className="flex items-baseline justify-between">
                <p className="text-xs text-gray-500">Last Month</p>
                <p className="text-gray-900">$18.2K</p>
              </div>
              <div className="flex items-baseline justify-between">
                <p className="text-xs text-gray-500">This Month</p>
                <p className="text-gray-900">$24.5K</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Main Dashboard Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Upcoming Events */}
          <Card className="lg:col-span-2 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-gray-900">Upcoming Events</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={onNavigateToGigs}
                className="text-sky-600 hover:text-sky-700 hover:bg-sky-50 border-sky-200"
              >
                Manage Events
              </Button>
            </div>
            <div className="space-y-4">
              {[
                { name: 'Summer Music Festival', date: 'Nov 15, 2025', status: 'Confirmed' },
                { name: 'Corporate Gala', date: 'Nov 22, 2025', status: 'Planning' },
                { name: 'Theater Production', date: 'Dec 1, 2025', status: 'Confirmed' },
              ].map((event, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div>
                    <p className="text-gray-900">{event.name}</p>
                    <p className="text-sm text-gray-500">{event.date}</p>
                  </div>
                  <Badge variant={event.status === 'Confirmed' ? 'default' : 'secondary'}>
                    {event.status}
                  </Badge>
                </div>
              ))}
            </div>
          </Card>

          {/* Recent Activity */}
          <Card className="p-6">
            <h3 className="text-gray-900 mb-4">Recent Activity</h3>
            <div className="space-y-4">
              {[
                { action: 'Equipment checked out', time: '2 hours ago' },
                { action: 'New team member added', time: '5 hours ago' },
                { action: 'Event updated', time: '1 day ago' },
                { action: 'Invoice generated', time: '2 days ago' },
              ].map((activity, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-sky-500 rounded-full mt-2" />
                  <div className="flex-1">
                    <p className="text-sm text-gray-900">{activity.action}</p>
                    <p className="text-xs text-gray-500">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
