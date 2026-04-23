export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      arbeitsrapporte: {
        Row: {
          arbeitszeit_stunden: number | null
          auftragswert_chf: number | null
          created_at: string
          fahrzeug_id: string | null
          fotos: string[] | null
          geplantes_datum: string
          id: string
          kategorie: string | null
          kunde_id: string | null
          mechaniker_zuweisung:
            | Database["public"]["Enums"]["mechaniker_name"]
            | null
          notizen: string | null
          pdf_url: string | null
          rapport_nummer: string | null
          sicherheitscheck: Json | null
          status: Database["public"]["Enums"]["rapport_status"]
          updated_at: string
        }
        Insert: {
          arbeitszeit_stunden?: number | null
          auftragswert_chf?: number | null
          created_at?: string
          fahrzeug_id?: string | null
          fotos?: string[] | null
          geplantes_datum?: string
          id?: string
          kategorie?: string | null
          kunde_id?: string | null
          mechaniker_zuweisung?:
            | Database["public"]["Enums"]["mechaniker_name"]
            | null
          notizen?: string | null
          pdf_url?: string | null
          rapport_nummer?: string | null
          sicherheitscheck?: Json | null
          status?: Database["public"]["Enums"]["rapport_status"]
          updated_at?: string
        }
        Update: {
          arbeitszeit_stunden?: number | null
          auftragswert_chf?: number | null
          created_at?: string
          fahrzeug_id?: string | null
          fotos?: string[] | null
          geplantes_datum?: string
          id?: string
          kategorie?: string | null
          kunde_id?: string | null
          mechaniker_zuweisung?:
            | Database["public"]["Enums"]["mechaniker_name"]
            | null
          notizen?: string | null
          pdf_url?: string | null
          rapport_nummer?: string | null
          sicherheitscheck?: Json | null
          status?: Database["public"]["Enums"]["rapport_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "arbeitsrapporte_fahrzeug_id_fkey"
            columns: ["fahrzeug_id"]
            isOneToOne: false
            referencedRelation: "fahrzeuge"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "arbeitsrapporte_kunde_id_fkey"
            columns: ["kunde_id"]
            isOneToOne: false
            referencedRelation: "kunden"
            referencedColumns: ["id"]
          },
        ]
      }
      fahrzeuge: {
        Row: {
          chassis_nr: string | null
          created_at: string
          id: string
          kennzeichen: string | null
          kunde_id: string | null
          kundennummer_hint: string | null
          marke: string | null
          modell: string | null
          updated_at: string
        }
        Insert: {
          chassis_nr?: string | null
          created_at?: string
          id?: string
          kennzeichen?: string | null
          kunde_id?: string | null
          kundennummer_hint?: string | null
          marke?: string | null
          modell?: string | null
          updated_at?: string
        }
        Update: {
          chassis_nr?: string | null
          created_at?: string
          id?: string
          kennzeichen?: string | null
          kunde_id?: string | null
          kundennummer_hint?: string | null
          marke?: string | null
          modell?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fahrzeuge_kunde_id_fkey"
            columns: ["kunde_id"]
            isOneToOne: false
            referencedRelation: "kunden"
            referencedColumns: ["id"]
          },
        ]
      }
      kunden: {
        Row: {
          created_at: string
          email: string | null
          id: string
          kundennummer: string | null
          name: string | null
          ort: string | null
          plz: string | null
          strasse: string | null
          telefon: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          kundennummer?: string | null
          name?: string | null
          ort?: string | null
          plz?: string | null
          strasse?: string | null
          telefon?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          kundennummer?: string | null
          name?: string | null
          ort?: string | null
          plz?: string | null
          strasse?: string | null
          telefon?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      rapport_positionen: {
        Row: {
          beschreibung: string | null
          created_at: string
          einheit: string | null
          erledigt: boolean
          id: string
          menge: number | null
          rapport_id: string
          sort_order: number
          typ: string
        }
        Insert: {
          beschreibung?: string | null
          created_at?: string
          einheit?: string | null
          erledigt?: boolean
          id?: string
          menge?: number | null
          rapport_id: string
          sort_order?: number
          typ: string
        }
        Update: {
          beschreibung?: string | null
          created_at?: string
          einheit?: string | null
          erledigt?: boolean
          id?: string
          menge?: number | null
          rapport_id?: string
          sort_order?: number
          typ?: string
        }
        Relationships: [
          {
            foreignKeyName: "rapport_positionen_rapport_id_fkey"
            columns: ["rapport_id"]
            isOneToOne: false
            referencedRelation: "arbeitsrapporte"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      mechaniker_name: "Roman" | "Pascal"
      rapport_status: "geplant" | "in_arbeit" | "erledigt" | "archiviert"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      mechaniker_name: ["Roman", "Pascal"],
      rapport_status: ["geplant", "in_arbeit", "erledigt", "archiviert"],
    },
  },
} as const
