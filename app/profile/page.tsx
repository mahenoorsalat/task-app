"use client";

import { Button } from "@/components/ui/button";
import { CreditCard, LogOut } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { useSubscription } from "@/hooks/useSubscription";
import { useAuth } from "@/hooks/useAuth";

export default function Profile() {
  const { user, isLoading, signOut } = useAuth();
  const { session } = useAuth();
  const { manageSubscription } = useSubscription();

  if (isLoading || !user) {
    return <LoadingSkeleton />;
  }
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold mb-6">User Profile</h1>
      <Card>
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
        </CardHeader>
        <CardContent className="text-sm">
          <p>Name: {user.name}</p>
          <p>Email: {user.email}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Subscription</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div>
            <p>Current Plan: {user.subscription_plan}</p>
            <p>
              Tasks Created: {user.tasks_created} / {user.tasks_limit}
            </p>
          </div>
          <Button onClick={() => manageSubscription(session?.access_token)}>
            <CreditCard className="mr-2 h-4 w-4" />
            Manage Subscription
          </Button>
        </CardContent>
      </Card>
      <div className="flex justify-end">
        <Button variant="outline" onClick={signOut}>
          <LogOut className="mr-2 h-4 w-4" />
          Sign Out
        </Button>
      </div>
    </div>
  );
}
