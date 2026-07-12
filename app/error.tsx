'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex h-screen w-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm text-center">
        <CardHeader>
          <CardTitle className="text-center text-lg">Noget gik galt</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Der opstod en uventet fejl. Prøv at genindlæse siden.
          </p>
          <Button onClick={() => reset()} className="w-full">
            Prøv igen
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
