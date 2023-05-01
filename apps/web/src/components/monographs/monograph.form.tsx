'use client'

import { useCallback, useState } from 'react'
import {
  type NextComponentType,
  type NextPage,
  type NextPageContext,
} from 'next'
import { zodResolver } from '@hookform/resolvers/zod'
import { type Monograph } from '@prisma/client'
import { Loader2, Upload } from 'lucide-react'
import { useDropzone } from 'react-dropzone'
import { useForm, type SubmitHandler } from 'react-hook-form'
import { type z } from 'zod'

import { newMonographSchema } from '@kyrian/api/schemas'
import {
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  useToast,
} from '@kyrian/ui'

import { api } from '~/utils/api'

type NewMonographValues = Omit<Monograph, 'createdAt'>

export type MonographFormProps = {
  defaultValues?: Partial<NewMonographValues>
}

type MonographFormValues = z.infer<typeof newMonographSchema>

const MonographForm: NextPage<MonographFormProps> = ({ defaultValues }) => {
  const { title, authorId } = defaultValues ?? {}
  const { data: degreePrograms, isLoading: isLoadingDegreePrograms } =
    api.degreeProgram.getNameAndCode.useQuery()

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<MonographFormValues>({
    resolver: zodResolver(newMonographSchema),
    defaultValues: {
      title: title,
      authorId: authorId ?? undefined,
    },
  })

  const [file, setFile] = useState<File | null>(null)
  const [missingFile, setMissingFile] = useState(false)
  const [isUploading, setIsUploading] = useState(false)

  const { mutateAsync: createMonograph, isLoading: isCreatingMonograph } =
    api.monograph.create.useMutation()
  const { mutateAsync: uploadMonograph, isLoading: isUploadingMonograph } =
    api.monograph.upload.useMutation()

  const toast = useToast()

  const onSubmit: SubmitHandler<MonographFormValues> = async (values) => {
    if (file === null) {
      setMissingFile(true)
      return
    }

    const monograph = await createMonograph(values)

    const url = await uploadMonograph({
      title: monograph.title,
      id: monograph.id,
    })

    setIsUploading(true)

    await fetch(url, {
      method: 'PUT',
      body: file,
    })

    setIsUploading(false)

    toast.toast({
      title: 'Monografía registrada',
      description: 'La monografía ha sido registrada con éxito',
    })

    reset()
    setFile(null)
  }

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0])
    }
  }, [])
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxFiles: 1,
    maxSize: 1024 * 1024 * 5, // 5 MB
    accept: {
      'application/pdf': ['.pdf'],
    },
  })

  return (
    <form
      className='app-grid app-gap-6 app-w-full px-2 py-2'
      onSubmit={handleSubmit(onSubmit)}
    >
      <div
        className='app-grid app-w-full app-items-center app-gap-1.5'
        {...getRootProps()}
      >
        <Label
          htmlFor='file'
          className='app-text-slate-500 app-flex app-h-32 app-w-full app-flex-col app-items-center app-justify-center app-rounded-lg app-border-2 app-border-dashed app-border-slate-200 app-p-5 app-cursor-pointer'
        >
          <span className='app-flex app-items-center app-gap-1.5'>
            <Upload size={24} />
            <span className='app-font-medium app-text-sm app-text-slate-600'>
              {file !== null
                ? file.name
                : 'Arrastra un archivo o haz clic aquí'}
            </span>
          </span>

          <span className='app-text-xs app-text-slate-400 app-pt-2'>
            {isDragActive
              ? 'Suelta el archivo aquí'
              : 'Solo se permiten archivos PDF de hasta 5MB'}
          </span>
        </Label>

        <input {...getInputProps()} />

        {missingFile && file === null && (
          <p className='app-text-sm app-text-red-500'>
            Debes seleccionar un archivo
          </p>
        )}
      </div>

      <div className='app-grid app-w-full app-items-center app-gap-1.5'>
        <Label htmlFor='title'>Título</Label>
        <Input
          id='title'
          type='text'
          placeholder='Título'
          {...register('title')}
        />

        {errors.title !== undefined ? (
          <p className='app-text-sm app-text-red-500'>{errors.title.message}</p>
        ) : (
          <p className='app-text-sm app-text-slate-500'>
            Digite el título de la monografía
          </p>
        )}
      </div>

      <div className='app-grid app-w-full app-items-center app-gap-1.5'>
        <Label htmlFor='publicationDate'>Fecha de publicación</Label>
        <Input
          id='publicationDate'
          type='date'
          placeholder='Fecha de publicación'
          {...register('publicationDate')}
        />

        {errors.publicationDate !== undefined ? (
          <p className='app-text-sm app-text-red-500'>
            {errors.publicationDate.message}
          </p>
        ) : (
          <p className='app-text-sm app-text-slate-500'>
            Digite la fecha de publicación de la monografía
          </p>
        )}
      </div>

      <div className='app-grid app-w-full app-items-center app-gap-1.5'>
        <Label htmlFor='authorId'>Identificación del autor</Label>
        <Input id='authorId' type='text' {...register('authorId')} />

        {errors.authorId !== undefined ? (
          <p className='app-text-sm app-text-red-500'>
            {errors.authorId.message}
          </p>
        ) : (
          <p className='app-text-sm app-text-slate-500'>
            Digite la identificación del autor de la monografía
          </p>
        )}
      </div>

      <div className='app-grid app-w-full app-items-center app-gap-1.5'>
        <Label htmlFor='degreeProgramId'>Programa académico</Label>
        <Select
          onValueChange={(value) => setValue('degreeProgramId', value)}
          {...register('degreeProgramId')}
        >
          <SelectTrigger>
            <SelectValue placeholder='Programa académico' />
          </SelectTrigger>

          <SelectContent>
            {isLoadingDegreePrograms && (
              <SelectItem value='Loading'>
                <div className='flex flex-row items-center'>
                  <Loader2 className='app-mr-2 app-h-4 app-w-4 app-animate-spin' />{' '}
                  <span>Cargando programas académicos...</span>
                </div>
              </SelectItem>
            )}

            {!isLoadingDegreePrograms &&
              degreePrograms !== undefined &&
              degreePrograms.length === 0 && (
                <SelectItem value='' disabled>
                  No hay programas académicos registrados
                </SelectItem>
              )}

            {!isLoadingDegreePrograms &&
              degreePrograms !== undefined &&
              degreePrograms.length > 0 && (
                <>
                  {degreePrograms?.map((degreeProgram) => (
                    <SelectItem
                      value={degreeProgram.code}
                      key={degreeProgram.code}
                    >
                      {degreeProgram.code}, {degreeProgram.name}
                    </SelectItem>
                  ))}
                </>
              )}
          </SelectContent>
        </Select>

        {errors.degreeProgramId !== undefined ? (
          <p className='app-text-sm app-text-red-500'>
            {errors.degreeProgramId.message}
          </p>
        ) : (
          <p className='app-text-sm app-text-slate-500'>
            Seleccione el programa académico al que pertenece la monografía
          </p>
        )}
      </div>

      <Button
        type='submit'
        disabled={isCreatingMonograph || isUploadingMonograph || isUploading}
      >
        {(isCreatingMonograph || isUploadingMonograph || isUploading) && (
          <Loader2 className='app-mr-2 app-h-4 app-w-4 app-animate-spin' />
        )}
        Registrar
      </Button>
    </form>
  )
}

export default api.withTRPC(MonographForm) as NextComponentType<
  NextPageContext,
  unknown,
  MonographFormProps
>
