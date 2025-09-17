import {
  Kysely,
  type Compilable,
  type Dialect,
  type DialectAdapter,
  type Driver,
  type DatabaseConnection,
  type DatabaseIntrospector,
  MssqlAdapter,
  MssqlQueryCompiler,
} from 'kysely';

type AnyRow = Record<string, unknown>;

export interface TareksDatabase {
  sky_kullanici: AnyRow & {
    kullaniciid: string;
    kod: string;
    ad: string | null;
    engelle: boolean | number | null;
    muhasebekod: string | null;
    email: string | null;
    bilgeuser: string | null;
  };
  sdi_tareksdetay_view: AnyRow & {
    tareksmasterid: string;
  };
  sdi_tareksparaisteme: AnyRow & {
    tareksparaistemeid: string;
    tareksmasterid: string;
    tutar: number | null;
    dovizkod: string | null;
    tip: number | null;
    kdvoran: number | null;
    tahakkukno: string | null;
    insuser: string | null;
    instime: Date | null;
  };
  sdi_tareksarama_view: AnyRow & {
    tareksmasterid: string;
    beyannameid: string | null;
    musteriad: string | null;
    referansno: string | null;
    subeadi: string | null;
    durum: string | null;
  };
  sgm_masraftur: AnyRow & {
    kdvoran: number | null;
    tarekskayittip: number;
    adi: string | null;
  };
}

class CompileOnlyDriver implements Driver {
  async init(): Promise<void> {
    // no-op for compile-only usage
  }

  async acquireConnection(): Promise<DatabaseConnection> {
    throw new Error('No database connections are available in compile-only builder mode.');
  }

  async beginTransaction(): Promise<void> {
    throw new Error('Transactions are not available in compile-only builder mode.');
  }

  async commitTransaction(): Promise<void> {
    throw new Error('Transactions are not available in compile-only builder mode.');
  }

  async rollbackTransaction(): Promise<void> {
    throw new Error('Transactions are not available in compile-only builder mode.');
  }

  async releaseConnection(): Promise<void> {
    // nothing to release
  }

  async destroy(): Promise<void> {
    // nothing to destroy
  }
}

class CompileOnlyIntrospector implements DatabaseIntrospector {
  async getSchemas(): ReturnType<DatabaseIntrospector['getSchemas']> {
    throw new Error('Schema introspection is not available in compile-only builder mode.');
  }

  async getTables(): ReturnType<DatabaseIntrospector['getTables']> {
    throw new Error('Table introspection is not available in compile-only builder mode.');
  }

  async getMetadata(): ReturnType<DatabaseIntrospector['getMetadata']> {
    throw new Error('Metadata introspection is not available in compile-only builder mode.');
  }
}

class CompileOnlyDialect implements Dialect {
  createDriver(): Driver {
    return new CompileOnlyDriver();
  }

  createQueryCompiler() {
    return new MssqlQueryCompiler();
  }

  createAdapter(): DialectAdapter {
    return new MssqlAdapter();
  }

  createIntrospector(): DatabaseIntrospector {
    return new CompileOnlyIntrospector();
  }
}

let compileDb: Kysely<TareksDatabase> | null = null;

export function getQueryBuilder(): Kysely<TareksDatabase> {
  if (!compileDb) {
    compileDb = new Kysely<TareksDatabase>({ dialect: new CompileOnlyDialect() });
  }
  return compileDb;
}

export type CompiledQueryResult<T> = ReturnType<Compilable<T>['compile']>;
